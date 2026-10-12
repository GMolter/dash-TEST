begin;
-- Additive permissions: existing admins receive no implicit sending grant.
insert into public.admin_permission_catalog(key,parent,is_write,protected,owner_only,version) values
('sections.email.read',null,false,false,false,1),
('email.read','sections.email.read',false,false,false,1),
('email.send','email.read',true,false,false,1),
('email.templates','email.read',true,false,false,1),
('email.history','email.read',false,false,false,1),
('email.global-history','email.read',false,true,true,1),
('email.administration','email.read',true,false,true,1);
insert into public.admin_permission_catalog(key,parent,is_write,protected,owner_only,version)
values('users.send-recovery','users.control',true,false,false,1);

create table public.email_drafts (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 revision integer not null default 1, subject text not null default '', html text not null default '',
 recipients jsonb not null default '[]', attachment_ids uuid[] not null default '{}', updated_at timestamptz not null default now(),
 check(octet_length(html)<=102400), check(length(subject)<=200)
);
create table public.email_templates (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 shared boolean not null default false, name text not null check(length(name) between 1 and 100), subject text not null, html text not null,
 check(length(subject)<=200), check(octet_length(html)<=102400)
);
create table public.email_attachments (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 path text not null unique, name text not null, mime text not null, size integer not null check(size between 1 and 5242880),
 sha256 text, created_at timestamptz not null default now()
);
create table public.email_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 signup boolean not null default false, organization boolean not null default false,
 review boolean not null default false, failure boolean not null default false
);
create table public.email_messages (
 id uuid primary key default gen_random_uuid(), owner_id uuid references auth.users(id) on delete set null,
 idempotency_key uuid not null, fingerprint text not null, subject text not null, html text, plain_text text,
 recipients jsonb not null, attachment_ids uuid[] not null default '{}', scheduled_at timestamptz not null,
 timezone text not null, created_at timestamptz not null default now(), unique(owner_id,idempotency_key)
);
-- No auth-account FK: an auth hook can execute before its account transaction commits.
create table public.email_jobs (
 id uuid primary key default gen_random_uuid(), message_id uuid references public.email_messages(id) on delete cascade,
 owner_id uuid, recipient text not null, kind text not null check(kind in ('manual','auth','notification','transactional')),
 event_type text, event_target uuid, payload jsonb, encrypted_payload text, dedupe_key text unique,
 status text not null default 'queued' check(status in ('scheduled','queued','sending','accepted','retry','failed','unknown','cancelled','expired')),
 attempts integer not null default 0, available_at timestamptz not null default now(), expires_at timestamptz,
 lease_token uuid, lease_until timestamptz, error_code text, created_at timestamptz not null default now(), completed_at timestamptz
);
create index email_jobs_due on public.email_jobs(available_at) where status in ('queued','scheduled','retry');
create index email_jobs_owner on public.email_jobs(owner_id,created_at desc);
create table public.email_attempts (
 id uuid primary key default gen_random_uuid(), job_id uuid references public.email_jobs(id) on delete cascade,
 attempt integer not null, status text not null, error_code text, created_at timestamptz not null default now()
);
create table public.email_events (
 id uuid primary key default gen_random_uuid(), event_type text not null, target_id uuid not null,
 dedupe_key text not null unique, created_at timestamptz not null default now(), expanded_at timestamptz
);
create table public.email_health (
 id boolean primary key default true check(id), paused boolean not null default false, error_code text,
 worker_token uuid, worker_until timestamptz, last_dispatch_at timestamptz
);
insert into public.email_health(id) values(true);
create table public.email_cooldowns (key text primary key, next_at timestamptz not null);

do $$ declare t text; begin
 foreach t in array array['email_drafts','email_templates','email_attachments','email_preferences','email_messages','email_jobs','email_attempts','email_events','email_health','email_cooldowns'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  execute format('create policy account_ban_guard on public.%I as restrictive for all to authenticated using (not exists(select 1 from public.account_ban_state where user_id=auth.uid() and banned_until>now()))',t);
 end loop;
end $$;
insert into storage.buckets(id,name,public,file_size_limit) values('email-attachments','email-attachments',false,5242880);
grant execute on function public.admin_has_permission(uuid,text) to service_role;
-- No browser storage policies. Only server-issued signed upload/download URLs grant access.

create function public.email_save_draft(p_actor uuid,p_id uuid,p_revision integer,p_data jsonb) returns public.email_drafts
language plpgsql security definer set search_path='' as $$
declare result public.email_drafts;
begin
 if not public.admin_has_permission(p_actor,'email.send') then raise exception 'PERMISSION_DENIED'; end if;
 if p_id is null then
  insert into public.email_drafts(owner_id,subject,html,recipients,attachment_ids) values(p_actor,p_data->>'subject',p_data->>'html',p_data->'recipients',array(select jsonb_array_elements_text(p_data->'attachment_ids')::uuid)) returning * into result;
 else
  update public.email_drafts set subject=p_data->>'subject',html=p_data->>'html',recipients=p_data->'recipients',attachment_ids=array(select jsonb_array_elements_text(p_data->'attachment_ids')::uuid),revision=revision+1,updated_at=now()
   where id=p_id and owner_id=p_actor and revision=p_revision returning * into result;
  if not found then raise exception 'DRAFT_CHANGED'; end if;
 end if;
 return result;
end $$;

create function public.email_submit(p_actor uuid,p_draft uuid,p_revision integer,p_key uuid,p_fingerprint text,p_snapshot jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare existing public.email_messages; draft public.email_drafts; result uuid; attachment uuid;
begin
 -- Serialize idempotency and per-admin rate admission, including concurrent submissions.
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,918));
 if not public.admin_has_permission(p_actor,'email.send') then raise exception 'PERMISSION_DENIED'; end if;
 select * into existing from public.email_messages where owner_id=p_actor and idempotency_key=p_key;
 if found then
  if existing.fingerprint<>p_fingerprint then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return existing.id;
 end if;
 select * into draft from public.email_drafts where id=p_draft and owner_id=p_actor for update;
 if not found or draft.revision<>p_revision then raise exception 'DRAFT_CHANGED'; end if;
 if jsonb_array_length(p_snapshot->'recipients') not between 1 and 50 then raise exception 'RECIPIENT_LIMIT'; end if;
 if (select count(*) from public.email_jobs where owner_id=p_actor and kind='manual' and created_at>now()-interval '1 hour')+jsonb_array_length(p_snapshot->'recipients')>50 then raise exception 'HOURLY_LIMIT'; end if;
 foreach attachment in array draft.attachment_ids loop
  perform 1 from public.email_attachments where id=attachment and owner_id=p_actor and sha256 is not null for update;
  if not found then raise exception 'ATTACHMENT_INVALID'; end if;
 end loop;
 insert into public.email_messages(owner_id,idempotency_key,fingerprint,subject,html,plain_text,recipients,attachment_ids,scheduled_at,timezone)
 values(p_actor,p_key,p_fingerprint,p_snapshot->>'subject',p_snapshot->>'html',p_snapshot->>'text',p_snapshot->'recipients',draft.attachment_ids,(p_snapshot->>'scheduled_at')::timestamptz,p_snapshot->>'timezone') returning id into result;
 insert into public.email_jobs(message_id,owner_id,recipient,kind,status,available_at)
 select result,p_actor,value,'manual',case when (p_snapshot->>'scheduled_at')::timestamptz>now() then 'scheduled' else 'queued' end,(p_snapshot->>'scheduled_at')::timestamptz from jsonb_array_elements_text(p_snapshot->'recipients');
 insert into public.admin_audit_log(operation_id,actor_id,action,resource,target_ids,reason,status,after_data,completed_at)
 values(gen_random_uuid(),p_actor,'send','email',array[result::text],'Confirmed email submission','succeeded',jsonb_build_object('recipients',jsonb_array_length(p_snapshot->'recipients')) ,now());
 delete from public.email_drafts where id=p_draft;
 return result;
end $$;

create function public.email_preferences_save(p_actor uuid,p_target uuid,p_preferences jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=p_actor and app_admin) or exists(select 1 from public.account_ban_state where user_id=p_actor and banned_until>now()) then raise exception 'PERMISSION_DENIED'; end if;
 if p_actor<>p_target and not public.admin_has_permission(p_actor,'email.administration') then raise exception 'PERMISSION_DENIED'; end if;
 if not exists(select 1 from public.profiles where id=p_target and app_admin) then raise exception 'PERMISSION_DENIED'; end if;
 insert into public.email_preferences(user_id,signup,organization,review,failure) values(p_target,(p_preferences->>'signup')::boolean,(p_preferences->>'organization')::boolean,(p_preferences->>'review')::boolean,(p_preferences->>'failure')::boolean)
 on conflict(user_id) do update set signup=excluded.signup,organization=excluded.organization,review=excluded.review,failure=excluded.failure;
 if p_actor<>p_target then
  insert into public.admin_audit_log(operation_id,actor_id,action,resource,target_ids,reason,status,after_data,completed_at)
  values(gen_random_uuid(),p_actor,'preferences','email',array[p_target::text],'Owner changed email subscriptions','succeeded',p_preferences,now());
 end if;
end $$;

create function public.email_record_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_schema='auth' then
  if tg_op='INSERT' then
   insert into public.email_events(event_type,target_id,dedupe_key) values('signup',new.id,'signup:'||new.id) on conflict do nothing;
   if new.email_confirmed_at is not null then insert into public.email_events(event_type,target_id,dedupe_key) values('welcome',new.id,'welcome:'||new.id) on conflict do nothing; end if;
  else
   if old.email_confirmed_at is null and new.email_confirmed_at is not null then insert into public.email_events(event_type,target_id,dedupe_key) values('welcome',new.id,'welcome:'||new.id) on conflict do nothing; end if;
   if old.encrypted_password is distinct from new.encrypted_password then insert into public.email_events(event_type,target_id,dedupe_key) values('password',new.id,'password:'||gen_random_uuid()) on conflict do nothing; end if;
  end if;
 elsif tg_table_name='organizations' then
  insert into public.email_events(event_type,target_id,dedupe_key) values('organization',new.id,'organization:'||new.id) on conflict do nothing;
 else
  if new.status='pending' then insert into public.email_events(event_type,target_id,dedupe_key) values('review',new.id,'review:'||new.id) on conflict do nothing; end if;
 end if;
 return new;
end $$;
create trigger email_auth_events after insert or update on auth.users for each row execute function public.email_record_event();
create trigger email_org_events after insert on public.organizations for each row execute function public.email_record_event();
create trigger email_review_events after insert on public.admin_access_requests for each row execute function public.email_record_event();

create function public.email_expand_events() returns void language plpgsql security definer set search_path='' as $$
declare event public.email_events; recipient record; title text; description text;
begin
 for event in select * from public.email_events where expanded_at is null order by created_at limit 30 for update skip locked loop
  title:=case event.event_type when 'signup' then 'New Olio signup' when 'organization' then 'New Olio organization' when 'review' then 'Pending Olio admin review' when 'failure' then 'Email needs attention' when 'welcome' then 'Welcome to Olio' else 'Your Olio password changed' end;
  description:=case event.event_type when 'welcome' then 'Your account is verified. Open Olio to get started.' when 'password' then 'Your account password was changed. If you did not make this change, request a password reset.' else 'Open the Olio admin workspace to review this event.' end;
  for recipient in
   select u.id,u.email from auth.users u left join public.profiles p on p.id=u.id left join public.email_preferences pref on pref.user_id=u.id
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

create function public.email_worker_lock(p_token uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.email_health set worker_token=p_token,worker_until=now()+interval '90 seconds',last_dispatch_at=now() where id and not paused and (worker_until is null or worker_until<now());
 return found;
end $$;
create function public.email_claim(p_worker uuid,p_auth boolean,p_manual boolean,p_hourly integer default 100) returns setof public.email_jobs
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
create function public.email_finish(p_id uuid,p_lease uuid,p_status text,p_error text,p_pause boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare job public.email_jobs; final_status text;
begin
 select * into job from public.email_jobs where id=p_id and lease_token=p_lease and status='sending' for update;
 if not found then return; end if;
 if p_status not in ('accepted','retry','failed','unknown','cancelled') then raise exception 'INVALID_STATUS'; end if;
 final_status:=case when p_status='retry' and job.attempts>=5 then 'failed' else p_status end;
 update public.email_jobs set status=final_status,error_code=p_error,lease_until=null,
  available_at=case when final_status='retry' then now()+make_interval(mins => (array[1,5,15,60])[least(job.attempts,4)]) else available_at end,
  completed_at=case when final_status<>'retry' then now() end,
  encrypted_payload=case when final_status='retry' then encrypted_payload else null end
 where id=p_id;
 update public.email_attempts set status=final_status,error_code=p_error where job_id=p_id and attempt=job.attempts;
 if p_pause then update public.email_health set paused=true,error_code='SMTP_CONFIGURATION' where id; end if;
 -- Alert delivery failures never recursively create alerts.
 if final_status in ('failed','unknown') and not (job.kind='notification' and coalesce(job.event_type,'')='failure') then
  insert into public.email_events(event_type,target_id,dedupe_key) values('failure',job.id,'failure:'||job.id||':'||job.attempts) on conflict do nothing;
 end if;
end $$;

create function public.email_cancel(p_actor uuid,p_message uuid,p_to_draft boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare message public.email_messages; result uuid;
begin
 select * into message from public.email_messages where id=p_message and owner_id=p_actor for update;
 if not found or not public.admin_has_permission(p_actor,'email.send') then raise exception 'PERMISSION_DENIED'; end if;
 perform 1 from public.email_jobs where message_id=p_message order by id for update;
 if p_to_draft and exists(select 1 from public.email_jobs where message_id=p_message and attempts>0) then raise exception 'DISPATCH_ALREADY_STARTED'; end if;
 update public.email_jobs set status='cancelled',completed_at=now() where message_id=p_message and status in ('scheduled','queued','retry');
 if p_to_draft then
  if exists(select 1 from public.email_drafts where id=p_message) then return p_message; end if;
  insert into public.email_drafts(id,owner_id,subject,html,recipients,attachment_ids) values(p_message,p_actor,message.subject,regexp_replace(message.html,'<p>Replies to this email are not monitored[.]</p>$',''),message.recipients,message.attachment_ids) returning id into result;
 end if;
 return result;
end $$;
create function public.email_retry(p_actor uuid,p_job uuid,p_confirm_unknown boolean) returns void
language plpgsql security definer set search_path='' as $$
declare job public.email_jobs;
begin
 select * into job from public.email_jobs where id=p_job for update;
 if not found or job.owner_id<>p_actor or job.kind<>'manual' or not public.admin_has_permission(p_actor,'email.send') then raise exception 'PERMISSION_DENIED'; end if;
 if job.status not in ('failed','unknown') or (job.status='unknown' and not p_confirm_unknown) then raise exception 'CONFIRM_DUPLICATE_RISK'; end if;
 if not exists(select 1 from public.email_messages where id=job.message_id and html is not null) then raise exception 'CONTENT_EXPIRED'; end if;
 update public.email_jobs set status='retry',available_at=now(),completed_at=null,error_code=null where id=p_job;
 insert into public.admin_audit_log(operation_id,actor_id,action,resource,target_ids,reason,status,completed_at)
 values(gen_random_uuid(),p_actor,'retry','email',array[p_job::text],case when job.status='unknown' then 'Confirmed duplicate delivery risk' else 'Confirmed retry' end,'succeeded',now());
end $$;
create function public.email_cooldown(p_key text,p_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
begin
 insert into public.email_cooldowns(key,next_at) values(p_key,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set next_at=excluded.next_at where email_cooldowns.next_at<=now();
 return found;
end $$;
create function public.email_auth_enqueue(p_jobs jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.email_jobs(recipient,kind,encrypted_payload,dedupe_key,expires_at)
 select value->>'recipient','auth',value->>'encrypted_payload',value->>'dedupe_key',(value->>'expires_at')::timestamptz from jsonb_array_elements(p_jobs)
 on conflict(dedupe_key) do nothing;
end $$;
create function public.email_cleanup() returns void language plpgsql security definer set search_path='' as $$
begin
 update public.email_jobs set status='expired',completed_at=now() where expires_at<=now() and status in ('queued','scheduled','retry');
 update public.email_jobs set encrypted_payload=null where expires_at<=now() and encrypted_payload is not null;
 update public.email_messages m set html=null,plain_text=null where created_at<now()-interval '30 days' and not exists(select 1 from public.email_jobs where message_id=m.id and status in ('scheduled','queued','retry','sending'));
 update public.email_jobs set payload=null,encrypted_payload=null where completed_at<now()-interval '30 days';
 delete from public.email_jobs where completed_at<now()-interval '90 days';
 delete from public.email_messages m where created_at<now()-interval '90 days' and not exists(select 1 from public.email_jobs where message_id=m.id);
 delete from public.email_cooldowns where next_at<now()-interval '1 day';
 -- Event deduplication receipts intentionally persist; this prevents repeat welcome emails.
end $$;
create function public.email_orphan_uploads() returns table(path text)
language sql security definer set search_path='' as $$
 select o.name from storage.objects o where o.bucket_id='email-attachments'
 and o.created_at<now()-interval '1 day'
 and not exists(select 1 from public.email_attachments a where a.path=o.name)
 order by o.created_at limit 100
$$;
-- Revoke default PUBLIC function execution for every entry point, including trigger helpers.
do $$ declare fn record; begin
 for fn in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname like 'email_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',fn.signature);
  execute format('grant execute on function %s to service_role',fn.signature);
 end loop;
end $$;
commit;
