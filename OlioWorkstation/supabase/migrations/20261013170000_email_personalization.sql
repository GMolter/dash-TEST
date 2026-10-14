-- Apply before deploying the refreshed composer. Keeps old queued messages compatible.
begin;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;

-- Also covers repair_current_profile without changing account roles.
create or replace function public.set_profile_signup_names() returns trigger
language plpgsql security definer set search_path='' as $$
declare metadata jsonb;
begin
 select raw_user_meta_data into metadata from auth.users where id=new.id;
 new.first_name := coalesce(new.first_name, nullif(left(btrim(metadata->>'first_name'),100),''));
 new.last_name := coalesce(new.last_name, nullif(left(btrim(metadata->>'last_name'),100),''));
 return new;
end $$;
revoke all on function public.set_profile_signup_names() from public,anon,authenticated;
drop trigger if exists olio_profile_signup_names on public.profiles;
create trigger olio_profile_signup_names before insert on public.profiles
for each row execute function public.set_profile_signup_names();

update public.profiles p set
 first_name=coalesce(p.first_name,nullif(left(btrim(u.raw_user_meta_data->>'first_name'),100),'')),
 last_name=coalesce(p.last_name,nullif(left(btrim(u.raw_user_meta_data->>'last_name'),100),''))
from auth.users u where u.id=p.id
 and (u.raw_user_meta_data ? 'first_name' or u.raw_user_meta_data ? 'last_name');

-- Freeze reviewed name values per recipient. Keep the message template editable
-- when an unstarted scheduled send is returned to drafts.
create or replace function public.email_submit_personalized(p_actor uuid,p_draft uuid,p_revision integer,p_key uuid,p_fingerprint text,p_snapshot jsonb) returns uuid
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
 insert into public.email_jobs(message_id,owner_id,recipient,kind,status,available_at,payload)
 select result,p_actor,value,'manual',case when (p_snapshot->>'scheduled_at')::timestamptz>now() then 'scheduled' else 'queued' end,(p_snapshot->>'scheduled_at')::timestamptz,case when p_snapshot->>'presentation'='olio-v1' then jsonb_build_object('presentation','olio-v1','variables',p_snapshot->'personalization'->value) else null end from jsonb_array_elements_text(p_snapshot->'recipients');
 insert into public.admin_audit_log(operation_id,actor_id,action,resource,target_ids,reason,status,after_data,completed_at)
 values(gen_random_uuid(),p_actor,'send','email',array[result::text],'Confirmed email submission','succeeded',jsonb_build_object('recipients',jsonb_array_length(p_snapshot->'recipients')) ,now());
 delete from public.email_drafts where id=p_draft;
 return result;
end $$;

revoke all on function public.email_submit_personalized(uuid,uuid,integer,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.email_submit_personalized(uuid,uuid,integer,uuid,text,jsonb) to service_role;
commit;
