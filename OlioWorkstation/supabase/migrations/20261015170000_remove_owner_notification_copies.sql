-- Send automatic notifications only to the current verified account email.
begin;
create or replace function public.support_email_allowed(p_user uuid,p_event uuid,p_recipient text,p_admin boolean) returns boolean
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


create or replace function public.email_claim(p_worker uuid,p_auth boolean,p_manual boolean,p_hourly integer default 100) returns setof public.email_jobs
language plpgsql security definer set search_path='' as $$
declare job public.email_jobs;
begin
 perform 1 from public.email_health where id and worker_token=p_worker and worker_until>now() and not paused for update;
 if not found then return; end if;
 -- Lost workers cannot imply that SMTP failed. Preserve uncertainty, never resend automatically.
 with lost as (update public.email_jobs set status='unknown',error_code='LEASE_EXPIRED',completed_at=now(),encrypted_payload=null where status='sending' and lease_until<now() returning *)
 insert into public.email_events(event_type,target_id,dedupe_key) select 'failure',id,'failure:'||id from lost where not (kind='notification' and coalesce(event_type,'')='failure') on conflict do nothing;
 update public.email_jobs set status='expired',encrypted_payload=null,payload=null,completed_at=now() where expires_at<=now() and status in ('queued','scheduled','retry');
 if (select count(*) from public.email_attempts where created_at>now()-interval '1 hour')>=greatest(1,least(p_hourly,100)) then return; end if;
 for job in select * from public.email_jobs where status in ('queued','scheduled','retry') and available_at<=now() and ((kind='auth' and p_auth) or (kind<>'auth' and p_manual)) order by (kind='auth') desc,available_at limit 20 for update skip locked loop
  if job.kind='manual' and not public.admin_has_permission(job.owner_id,'email.send') then
   update public.email_jobs set status='cancelled',completed_at=now(),error_code='ACCESS_REVOKED' where message_id=job.message_id and status in ('scheduled','queued','retry'); continue;
  end if;
  if job.kind='manual' and (select count(*) from public.email_attempts a join public.email_jobs j on j.id=a.job_id where j.owner_id=job.owner_id and j.kind='manual' and a.created_at>now()-interval '1 hour')>=50 then continue; end if;
  if job.kind in ('notification','transactional') then
   if not exists(select 1 from auth.users u where u.id=job.owner_id and u.email_confirmed_at is not null and lower(u.email)=job.recipient) or exists(select 1 from public.account_ban_state where user_id=job.owner_id and banned_until>now()) or
    (job.kind='notification' and not exists(select 1 from public.profiles p join public.email_preferences pref on pref.user_id=p.id where p.id=job.owner_id and p.app_admin and coalesce((to_jsonb(pref)->>job.event_type)::boolean,false) and (job.event_type<>'review' or p.app_owner) and (job.event_type<>'failure' or p.app_owner or exists(select 1 from public.email_jobs original where original.id=job.event_target and original.owner_id=p.id)))) then
     update public.email_jobs set status='cancelled',payload=null,completed_at=now() where id=job.id; continue;
   end if;
  end if;
  update public.email_jobs set status='sending',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '90 seconds' where id=job.id returning * into job;
  insert into public.email_attempts(job_id,attempt,status) values(job.id,job.attempts,'sending');
  return next job; return;
 end loop;
end $$;

-- Cancel unsent copies; preserve delivery history.
update public.email_jobs set status='cancelled',payload=null,completed_at=now(),error_code='OWNER_COPY_REMOVED' where kind='notification' and dedupe_key like '%:owner-copy' and status in ('queued','scheduled','retry');
commit;
