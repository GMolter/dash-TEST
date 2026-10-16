-- Preserve existing tickets and older clients; the new form explicitly opts in or out.
begin;
alter table public.support_tickets add column email_updates boolean not null default true;
drop function public.support_mutate(uuid,text,uuid,text,text);
create function public.support_mutate(p_request uuid,p_action text,p_ticket uuid default null,p_category text default null,p_body text default '',p_email_updates boolean default true) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); is_admin boolean; ticket public.support_tickets; prior public.support_events; event_id uuid; actor_name text;
begin
 if actor is null or not public.current_account_is_allowed() then raise exception 'PERMISSION_DENIED'; end if;
 if p_request is null or p_action is null or p_action not in ('created','reply','completed','reopened') then raise exception 'INVALID_REQUEST'; end if;
 p_body:=regexp_replace(p_body,'^[[:space:]]+|[[:space:]]+$','','g');
 is_admin:=public.support_is_admin();
 perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request::text,0));
 select * into prior from public.support_events where actor_id=actor and request_id=p_request;
 if found then
  if prior.kind<>p_action or prior.body<>coalesce(btrim(p_body),'') or (p_action<>'created' and prior.ticket_id is distinct from p_ticket) then raise exception 'REQUEST_CONFLICT'; end if;
  select * into ticket from public.support_tickets where id=prior.ticket_id;
  if ticket.user_id<>actor and not is_admin then raise exception 'PERMISSION_DENIED'; end if;
  if p_action='created' and (ticket.category is distinct from p_category or ticket.email_updates is distinct from coalesce(p_email_updates,false)) then raise exception 'REQUEST_CONFLICT'; end if;
  return prior.ticket_id;
 end if;
 if p_action in ('created','reply') and (p_body is null or char_length(btrim(p_body)) not between 1 and 5000) then raise exception 'INVALID_BODY'; end if;
 if p_action in ('completed','reopened') and coalesce(p_body,'')<>'' then raise exception 'INVALID_BODY'; end if;
 select coalesce(nullif(p.display_name,''),u.email,'Olio user') into actor_name from auth.users u left join public.profiles p on p.id=u.id where u.id=actor;
 if p_action='created' then
  if p_category is null or p_category not in ('account','dashboard','projects','quicklinks','organizations','other') then raise exception 'INVALID_CATEGORY'; end if;
  insert into public.support_tickets(user_id,requester,category,description,email_updates) values(actor,actor_name,p_category,btrim(p_body),coalesce(p_email_updates,false)) returning * into ticket;
 else
  select * into ticket from public.support_tickets where id=p_ticket for update;
  if not found or (ticket.user_id<>actor and not is_admin) then raise exception 'TICKET_UNAVAILABLE'; end if;
  if p_action='reply' and ticket.status<>'open' then raise exception 'TICKET_COMPLETED'; end if;
  if p_action in ('completed','reopened') then
   if not is_admin then raise exception 'PERMISSION_DENIED'; end if;
   if (p_action='completed' and ticket.status='completed') or (p_action='reopened' and ticket.status='open') then raise exception 'STATUS_CHANGED'; end if;
  end if;
  update public.support_tickets set revision=revision+1,updated_at=clock_timestamp(),
   status=case p_action when 'completed' then 'completed' when 'reopened' then 'open' else status end
   where id=ticket.id returning * into ticket;
 end if;
 insert into public.support_events(ticket_id,sequence,actor_id,author,admin,kind,body,request_id)
 values(ticket.id,ticket.revision,actor,actor_name,is_admin and (ticket.user_id<>actor or p_action in ('completed','reopened')),p_action,btrim(p_body),p_request) returning id into event_id;
 -- The outbox is committed with the conversation; delivery happens asynchronously.
 if ticket.email_updates or (actor=ticket.user_id and p_action in ('created','reply')) then
 insert into public.email_events(event_type,target_id,dedupe_key)
 values(case when actor=ticket.user_id and p_action in ('created','reply') then 'support' else 'support_user' end,event_id,'support:'||event_id);
 end if;
 return ticket.id;
end $$;
revoke all on function public.support_mutate(uuid,text,uuid,text,text,boolean) from public,anon;
grant execute on function public.support_mutate(uuid,text,uuid,text,text,boolean) to authenticated;

create or replace function public.support_email_allowed(p_user uuid,p_event uuid,p_recipient text,p_admin boolean) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u
  join public.support_events e on e.id=p_event join public.support_tickets t on t.id=e.ticket_id
  left join public.profiles p on p.id=u.id left join public.email_preferences pref on pref.user_id=u.id
  where u.id=p_user and u.email_confirmed_at is not null and lower(u.email)=p_recipient
  and not exists(select 1 from public.account_ban_state b where b.user_id=u.id and b.banned_until>now())
  and ((p_admin and p.app_admin and pref.support) or (not p_admin and t.user_id=u.id and t.email_updates)))
$$;
revoke all on function public.support_email_allowed(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.support_email_allowed(uuid,uuid,text,boolean) to service_role;


create or replace function public.email_expand_events() returns void language plpgsql security definer set search_path='' as $$
declare event public.email_events; recipient record; title text; description text; support_event record;
begin
 for event in select * from public.email_events where expanded_at is null order by created_at limit 30 for update skip locked loop
  if event.event_type in ('support','support_user') then
   select e.*,t.user_id,t.reference,t.email_updates into support_event from public.support_events e join public.support_tickets t on t.id=e.ticket_id where e.id=event.target_id;
   if found then
    title:='Support ticket #'||support_event.reference||': '||case support_event.kind when 'created' then 'new ticket' when 'reply' then 'new reply' when 'completed' then 'completed' else 'reopened' end;
    for recipient in select u.id,u.email,p.app_owner from auth.users u left join public.profiles p on p.id=u.id left join public.email_preferences pref on pref.user_id=u.id
     where u.email_confirmed_at is not null and u.email is not null and u.id is distinct from support_event.actor_id
     and not exists(select 1 from public.account_ban_state b where b.user_id=u.id and b.banned_until>now())
     and ((event.event_type='support' and p.app_admin and coalesce(pref.support,false)) or (event.event_type='support_user' and support_event.email_updates and u.id=support_event.user_id))
    loop
     insert into public.email_jobs(owner_id,recipient,kind,event_type,event_target,payload,dedupe_key)
     values(recipient.id,lower(recipient.email),case when event.event_type='support' then 'notification' else 'transactional' end,event.event_type,event.target_id,jsonb_build_object('subject',title),event.id||':'||recipient.id) on conflict(dedupe_key) do nothing;
    end loop;
   end if;
   update public.email_events set expanded_at=now() where id=event.id;
   continue;
  end if;
  title:=case event.event_type when 'signup' then 'New Olio signup' when 'organization' then 'New Olio organization' when 'review' then 'Pending Olio admin review' when 'failure' then 'Email needs attention' when 'welcome' then 'Welcome to Olio' else 'Your Olio password changed' end;
  description:=case event.event_type when 'welcome' then 'Your account is verified. Open Olio to get started.' when 'password' then 'Your account password was changed. If you did not make this change, request a password reset.' else 'Open the Olio admin workspace to review this event.' end;
  for recipient in
   select u.id,u.email,p.app_owner from auth.users u left join public.profiles p on p.id=u.id left join public.email_preferences pref on pref.user_id=u.id
   where u.email_confirmed_at is not null and u.email is not null and not exists(select 1 from public.account_ban_state b where b.user_id=u.id and b.banned_until>now()) and
   ((event.event_type in ('welcome','password') and u.id=event.target_id) or
    (p.app_admin and coalesce((to_jsonb(pref)->>event.event_type)::boolean,false) and
      (event.event_type<>'review' or p.app_owner) and
      (event.event_type<>'failure' or p.app_owner or exists(select 1 from public.email_jobs j where j.id=event.target_id and j.owner_id=u.id))))
  loop
   insert into public.email_jobs(owner_id,recipient,kind,event_type,event_target,payload,dedupe_key)
   values(recipient.id,lower(recipient.email),case when event.event_type in ('welcome','password') then 'transactional' else 'notification' end,event.event_type,event.target_id,jsonb_build_object('subject',title,'html','<p>'||description||'</p><p>Replies to this email are not monitored.</p>','text',description||E'\n\nReplies to this email are not monitored.'),event.id||':'||recipient.id) on conflict(dedupe_key) do nothing;
  end loop;
  update public.email_events set expanded_at=now() where id=event.id;
 end loop;
end $$;



commit;
