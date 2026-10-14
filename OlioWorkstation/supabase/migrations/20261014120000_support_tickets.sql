begin;
create table public.support_tickets (
 id uuid primary key default gen_random_uuid(),
 reference bigint generated always as identity unique,
 user_id uuid not null references auth.users(id) on delete cascade,
 requester text not null,
 category text not null check(category in ('account','dashboard','projects','quicklinks','organizations','other')),
 description text not null check(char_length(btrim(description)) between 1 and 5000),
 status text not null default 'open' check(status in ('open','completed')),
 revision integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index support_tickets_owner on public.support_tickets(user_id,status,updated_at desc);
create index support_tickets_inbox on public.support_tickets(status,updated_at desc);
create table public.support_events (
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 sequence integer not null,
 actor_id uuid references auth.users(id) on delete set null,
 author text not null,
 admin boolean not null,
 kind text not null check(kind in ('created','reply','completed','reopened')),
 body text not null default '' check(char_length(body)<=5000),
 request_id uuid not null,
 created_at timestamptz not null default now(),
 unique(ticket_id,sequence), unique(actor_id,request_id)
);
create table public.support_reads (
 ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 sequence integer not null default 0,
 primary key(ticket_id,user_id)
);
create function public.support_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select app_admin from public.profiles where id=auth.uid()),false) and public.current_account_is_allowed()
$$;
revoke all on function public.support_is_admin() from public,anon;
grant execute on function public.support_is_admin() to authenticated;
alter table public.support_tickets enable row level security;
alter table public.support_events enable row level security;
alter table public.support_reads enable row level security;
revoke all on public.support_tickets,public.support_events,public.support_reads from public,anon,authenticated;
grant select on public.support_tickets,public.support_events,public.support_reads to authenticated;
grant all on public.support_tickets,public.support_events,public.support_reads to service_role;
create policy support_ticket_read on public.support_tickets for select to authenticated using
 (public.current_account_is_allowed() and (user_id=auth.uid() or public.support_is_admin()));
create policy support_event_read on public.support_events for select to authenticated using
 (exists(select 1 from public.support_tickets t where t.id=ticket_id));
create policy support_read_read on public.support_reads for select to authenticated using
 (user_id=auth.uid() and exists(select 1 from public.support_tickets t where t.id=ticket_id));

-- All writes derive the actor from the session. No client-supplied ownership or role.
create function public.support_mutate(p_request uuid,p_action text,p_ticket uuid default null,p_category text default null,p_body text default '') returns uuid
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
  if p_action='created' and ticket.category is distinct from p_category then raise exception 'REQUEST_CONFLICT'; end if;
  return prior.ticket_id;
 end if;
 if p_action in ('created','reply') and (p_body is null or char_length(btrim(p_body)) not between 1 and 5000) then raise exception 'INVALID_BODY'; end if;
 if p_action in ('completed','reopened') and coalesce(p_body,'')<>'' then raise exception 'INVALID_BODY'; end if;
 select coalesce(nullif(p.display_name,''),u.email,'Olio user') into actor_name from auth.users u left join public.profiles p on p.id=u.id where u.id=actor;
 if p_action='created' then
  if p_category is null or p_category not in ('account','dashboard','projects','quicklinks','organizations','other') then raise exception 'INVALID_CATEGORY'; end if;
  insert into public.support_tickets(user_id,requester,category,description) values(actor,actor_name,p_category,btrim(p_body)) returning * into ticket;
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
 insert into public.email_events(event_type,target_id,dedupe_key)
 values(case when actor=ticket.user_id and p_action in ('created','reply') then 'support' else 'support_user' end,event_id,'support:'||event_id);
 return ticket.id;
end $$;
revoke all on function public.support_mutate(uuid,text,uuid,text,text) from public,anon;
grant execute on function public.support_mutate(uuid,text,uuid,text,text) to authenticated;

create function public.support_mark_read(p_ticket uuid,p_sequence integer) returns void
language plpgsql security definer set search_path='' as $$
declare ticket public.support_tickets;
begin
 if auth.uid() is null or not public.current_account_is_allowed() then raise exception 'PERMISSION_DENIED'; end if;
 select * into ticket from public.support_tickets where id=p_ticket;
 if not found or (ticket.user_id<>auth.uid() and not public.support_is_admin()) then raise exception 'TICKET_UNAVAILABLE'; end if;
 if p_sequence is null or p_sequence<0 or p_sequence>ticket.revision then raise exception 'INVALID_SEQUENCE'; end if;
 insert into public.support_reads(ticket_id,user_id,sequence) values(p_ticket,auth.uid(),p_sequence)
 on conflict(ticket_id,user_id) do update set sequence=greatest(public.support_reads.sequence,excluded.sequence);
end $$;
revoke all on function public.support_mark_read(uuid,integer) from public,anon;
grant execute on function public.support_mark_read(uuid,integer) to authenticated;

create function public.support_list(p_admin boolean default false,p_status text default 'open',p_offset integer default 0) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null or not public.current_account_is_allowed() or (p_admin and not public.support_is_admin()) then raise exception 'PERMISSION_DENIED'; end if;
 return jsonb_build_object('tickets',coalesce((select jsonb_agg(to_jsonb(rows)) from (
  select t.*,exists(select 1 from public.support_events e where e.ticket_id=t.id and e.actor_id is distinct from auth.uid() and e.sequence>coalesce(r.sequence,0)) as unread
  from public.support_tickets t left join public.support_reads r on r.ticket_id=t.id and r.user_id=auth.uid()
  where (p_admin or t.user_id=auth.uid()) and t.status=p_status order by t.updated_at desc,t.id limit 25 offset greatest(p_offset,0)
 ) rows),'[]'::jsonb), 'total',(select count(*) from public.support_tickets where (p_admin or user_id=auth.uid()) and status=p_status));
end $$;
create function public.support_unread(p_admin boolean default false) returns integer language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null or not public.current_account_is_allowed() or (p_admin and not public.support_is_admin()) then raise exception 'PERMISSION_DENIED'; end if;
 return (select count(*)::integer from public.support_tickets t left join public.support_reads r on r.ticket_id=t.id and r.user_id=auth.uid()
 where (p_admin or t.user_id=auth.uid()) and exists(select 1 from public.support_events e where e.ticket_id=t.id and e.actor_id is distinct from auth.uid() and e.sequence>coalesce(r.sequence,0)));
end $$;
revoke all on function public.support_list(boolean,text,integer),public.support_unread(boolean) from public,anon;
grant execute on function public.support_list(boolean,text,integer),public.support_unread(boolean) to authenticated;

alter table public.email_preferences add column support boolean not null default false;

-- Recheck immediately before SMTP, including removal of a ticket or admin access.
create function public.support_email_allowed(p_user uuid,p_event uuid,p_recipient text,p_admin boolean) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u
  join public.support_events e on e.id=p_event join public.support_tickets t on t.id=e.ticket_id
  left join public.profiles p on p.id=u.id left join public.email_preferences pref on pref.user_id=u.id
  where u.id=p_user and u.email_confirmed_at is not null and lower(u.email)=p_recipient
  and not exists(select 1 from public.account_ban_state b where b.user_id=u.id and b.banned_until>now())
  and ((p_admin and p.app_admin and pref.support) or (not p_admin and t.user_id=u.id)))
$$;
revoke all on function public.support_email_allowed(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.support_email_allowed(uuid,uuid,text,boolean) to service_role;


create or replace function public.email_preferences_save(p_actor uuid,p_target uuid,p_preferences jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=p_actor and app_admin) or exists(select 1 from public.account_ban_state where user_id=p_actor and banned_until>now()) then raise exception 'PERMISSION_DENIED'; end if;
 if p_actor<>p_target and not public.admin_has_permission(p_actor,'email.administration') then raise exception 'PERMISSION_DENIED'; end if;
 if not exists(select 1 from public.profiles where id=p_target and app_admin) then raise exception 'PERMISSION_DENIED'; end if;
 insert into public.email_preferences(user_id,signup,organization,review,failure,support) values(p_target,(p_preferences->>'signup')::boolean,(p_preferences->>'organization')::boolean,(p_preferences->>'review')::boolean,(p_preferences->>'failure')::boolean,coalesce((p_preferences->>'support')::boolean,false))
 on conflict(user_id) do update set signup=excluded.signup,organization=excluded.organization,review=excluded.review,failure=excluded.failure,support=excluded.support;
 if p_actor<>p_target then
  insert into public.admin_audit_log(operation_id,actor_id,action,resource,target_ids,reason,status,after_data,completed_at)
  values(gen_random_uuid(),p_actor,'preferences','email',array[p_target::text],'Owner changed email subscriptions','succeeded',p_preferences,now());
 end if;
end $$;

create or replace function public.email_expand_events() returns void language plpgsql security definer set search_path='' as $$
declare event public.email_events; recipient record; title text; description text; support_event record;
begin
 for event in select * from public.email_events where expanded_at is null order by created_at limit 30 for update skip locked loop
  if event.event_type in ('support','support_user') then
   select e.*,t.user_id,t.reference into support_event from public.support_events e join public.support_tickets t on t.id=e.ticket_id where e.id=event.target_id;
   if found then
    title:='Support ticket #'||support_event.reference||': '||case support_event.kind when 'created' then 'new ticket' when 'reply' then 'new reply' when 'completed' then 'completed' else 'reopened' end;
    for recipient in select u.id,u.email from auth.users u left join public.profiles p on p.id=u.id left join public.email_preferences pref on pref.user_id=u.id
     where u.email_confirmed_at is not null and u.email is not null and u.id is distinct from support_event.actor_id
     and not exists(select 1 from public.account_ban_state b where b.user_id=u.id and b.banned_until>now())
     and ((event.event_type='support' and p.app_admin and coalesce(pref.support,false)) or (event.event_type='support_user' and u.id=support_event.user_id))
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
   -- Owner-requested copy for administrative notifications only.
   if event.event_type in ('signup','organization','review','failure') and recipient.app_owner and lower(recipient.email)='gavin@olio.one' then
    insert into public.email_jobs(owner_id,recipient,kind,event_type,event_target,payload,dedupe_key)
    values(recipient.id,'gmolter8@gmail.com','notification',event.event_type,event.target_id,jsonb_build_object('subject',title,'html','<p>'||description||'</p><p>Replies to this email are not monitored.</p>','text',description||E'\n\nReplies to this email are not monitored.'),event.id||':'||recipient.id||':owner-copy') on conflict(dedupe_key) do nothing;
   end if;
  end loop;
  update public.email_events set expanded_at=now() where id=event.id;
 end loop;
end $$;


commit;
