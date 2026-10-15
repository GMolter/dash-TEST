-- Preserve the existing owner-approved notification copy for support tickets.
-- Does not replay expanded events or resend already accepted messages.
begin;
create or replace function public.support_email_allowed(p_user uuid,p_event uuid,p_recipient text,p_admin boolean) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u
  join public.support_events e on e.id=p_event join public.support_tickets t on t.id=e.ticket_id
  left join public.profiles p on p.id=u.id left join public.email_preferences pref on pref.user_id=u.id
  where u.id=p_user and u.email_confirmed_at is not null and (lower(u.email)=p_recipient or (p_admin and p.app_owner and lower(u.email)='gavin@olio.one' and p_recipient='gmolter8@gmail.com'))
  and not exists(select 1 from public.account_ban_state b where b.user_id=u.id and b.banned_until>now())
  and ((p_admin and p.app_admin and pref.support) or (not p_admin and t.user_id=u.id)))
$$;
revoke all on function public.support_email_allowed(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.support_email_allowed(uuid,uuid,text,boolean) to service_role;


create or replace function public.email_expand_events() returns void language plpgsql security definer set search_path='' as $$
declare event public.email_events; recipient record; title text; description text; support_event record;
begin
 for event in select * from public.email_events where expanded_at is null order by created_at limit 30 for update skip locked loop
  if event.event_type in ('support','support_user') then
   select e.*,t.user_id,t.reference into support_event from public.support_events e join public.support_tickets t on t.id=e.ticket_id where e.id=event.target_id;
   if found then
    title:='Support ticket #'||support_event.reference||': '||case support_event.kind when 'created' then 'new ticket' when 'reply' then 'new reply' when 'completed' then 'completed' else 'reopened' end;
    for recipient in select u.id,u.email,p.app_owner from auth.users u left join public.profiles p on p.id=u.id left join public.email_preferences pref on pref.user_id=u.id
     where u.email_confirmed_at is not null and u.email is not null and u.id is distinct from support_event.actor_id
     and not exists(select 1 from public.account_ban_state b where b.user_id=u.id and b.banned_until>now())
     and ((event.event_type='support' and p.app_admin and coalesce(pref.support,false)) or (event.event_type='support_user' and u.id=support_event.user_id))
    loop
     insert into public.email_jobs(owner_id,recipient,kind,event_type,event_target,payload,dedupe_key)
     values(recipient.id,lower(recipient.email),case when event.event_type='support' then 'notification' else 'transactional' end,event.event_type,event.target_id,jsonb_build_object('subject',title),event.id||':'||recipient.id) on conflict(dedupe_key) do nothing;
     -- Preserve the owner's existing administrative-notification copy for support too.
     if event.event_type='support' and recipient.app_owner and lower(recipient.email)='gavin@olio.one' then
      insert into public.email_jobs(owner_id,recipient,kind,event_type,event_target,payload,dedupe_key)
      values(recipient.id,'gmolter8@gmail.com','notification',event.event_type,event.target_id,jsonb_build_object('subject',title),event.id||':'||recipient.id||':owner-copy') on conflict(dedupe_key) do nothing;
     end if;
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
