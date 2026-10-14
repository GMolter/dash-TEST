// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
const owner = '11111111-1111-4111-8111-111111111111',
  admin = '22222222-2222-4222-8222-222222222222',
  worker = '33333333-3333-4333-8333-333333333333';
let db: PGlite;
async function scalar(sql: string, params: unknown[] = []) {
  const result = await db.query<{ value: unknown }>(sql, params);
  return result.rows[0]?.value;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
  create schema auth; create schema storage;
  create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,encrypted_password text,raw_user_meta_data jsonb);
  create table public.profiles(id uuid primary key references auth.users(id),display_name text,app_admin boolean default true,app_owner boolean default false);
  create table public.account_ban_state(user_id uuid primary key,banned_until timestamptz);
  create table public.organizations(id uuid primary key);
  create table public.admin_access_requests(id uuid primary key,status text);
  create table public.admin_permission_catalog(key text primary key,parent text,is_write boolean,protected boolean,owner_only boolean,version integer);
  create table public.admin_permission_grants(user_id uuid,permission_key text,primary key(user_id,permission_key));
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);
  create table storage.objects(name text,bucket_id text,created_at timestamptz);`);
  const old = readFileSync(
    'supabase/migrations/20261012010000_specific_admin_privileges.sql',
    'utf8',
  );
  await db.exec(
    old.slice(
      old.indexOf('create function public.admin_has_permission'),
      old.indexOf('revoke all on function public.admin_has_permission'),
    ),
  );
  const audit = readFileSync(
    'supabase/migrations/20260908120000_admin_operations_console.sql',
    'utf8',
  );
  await db.exec(
    audit.slice(audit.indexOf('create table'), audit.indexOf('alter table')),
  );
  await db.exec(
    readFileSync(
      'supabase/migrations/20261012030000_email_integration.sql',
      'utf8',
    ),
  );
  await db.exec(readFileSync('supabase/migrations/20261013150000_owner_notification_copy.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261013170000_email_personalization.sql', 'utf8'));
  await db.exec(`grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
  create function public.current_account_is_allowed() returns boolean language sql stable security definer as $$select not exists(select 1 from public.account_ban_state where user_id=auth.uid() and banned_until>now())$$;`);
  await db.exec(readFileSync('supabase/migrations/20261014120000_support_tickets.sql', 'utf8'));
}, 30000);
beforeEach(async () => {
  await db.exec(`reset role; truncate public.email_attempts,public.email_jobs,public.email_messages,public.email_drafts,public.email_attachments,public.email_events,public.email_preferences,public.email_cooldowns,public.admin_audit_log,public.admin_permission_grants,public.account_ban_state,public.profiles,auth.users cascade;
  update public.email_health set worker_token=null,worker_until=null,paused=false,error_code=null;
  insert into auth.users(id,email,email_confirmed_at,encrypted_password) values('${owner}','owner@example.com',now(),'original'),('${admin}','admin@example.com',now(),'original');
  insert into public.profiles(id,app_admin,app_owner) values('${owner}',true,true),('${admin}',true,false);
  delete from public.email_events;`);
});
afterAll(async () => {
  await db?.close();
});
const user = '44444444-4444-4444-8444-444444444444';
async function actor(id: string) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec('set role authenticated');
}
async function setupUser() {
  await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [user, 'user@example.com']);
  await db.query('insert into public.profiles(id,app_admin) values($1,false)', [user]);
  await db.exec('delete from public.email_events');
  await actor(user);
}
const mutate = (action: string, ticket: unknown = null, body = '', request = randomUUID()) => scalar('select public.support_mutate($1,$2,$3,$4,$5) as value', [request, action, ticket, action === 'created' ? 'account' : null, body]);
it('isolates users, denies direct writes and impersonation, and lets every app admin see tickets', async () => {
  await setupUser();
  const ticket = await mutate('created', null, 'Please help');
  await expect(db.query('update public.support_tickets set status=$1 where id=$2', ['completed', ticket])).rejects.toThrow(/permission denied/);
  await expect(mutate('completed', ticket)).rejects.toThrow('PERMISSION_DENIED');
  await actor(worker);
  expect(await scalar('select count(*) as value from public.support_tickets')).toBe(0);
  expect(await scalar('select count(*) as value from public.support_events')).toBe(0);
  await expect(mutate('reply', ticket, 'Sneaky')).rejects.toThrow('TICKET_UNAVAILABLE');
  await expect(scalar('select public.support_list(true) as value')).rejects.toThrow('PERMISSION_DENIED');
  await actor(admin);
  expect(await scalar('select count(*) as value from public.support_tickets')).toBe(1);
  await mutate('reply', ticket, 'We can help');
  await db.exec('reset role');
  await db.query('update public.profiles set app_admin=false where id=$1', [admin]);
  await actor(admin);
  expect(await scalar('select count(*) as value from public.support_tickets')).toBe(0);
  await expect(mutate('reply', ticket, 'No longer allowed')).rejects.toThrow('TICKET_UNAVAILABLE');
});
it('validates content, deduplicates retries atomically, and protects completed tickets', async () => {
  await setupUser();
  await expect(mutate('created', null, '  ')).rejects.toThrow('INVALID_BODY');
  await expect(mutate('created', null, '\n\t\r')).rejects.toThrow('INVALID_BODY');
  await expect(mutate('created', null, 'x'.repeat(5001))).rejects.toThrow('INVALID_BODY');
  const request = randomUUID();
  const ticket = await mutate('created', null, 'Help', request);
  expect(await mutate('created', null, 'Help', request)).toBe(ticket);
  await expect(mutate('created', null, 'Different', request)).rejects.toThrow('REQUEST_CONFLICT');
  expect(await scalar('select count(*) as value from public.support_events')).toBe(1);
  await actor(admin);
  const replyRequest = randomUUID();
  await mutate('reply', ticket, 'Working on this', replyRequest);
  await mutate('completed', ticket);
  expect(await mutate('reply', ticket, 'Working on this', replyRequest)).toBe(ticket);
  await actor(user);
  await expect(mutate('reply', ticket, 'Follow up')).rejects.toThrow('TICKET_COMPLETED');
  await actor(admin); await mutate('reopened', ticket);
  await actor(user); await mutate('reply', ticket, 'Thanks');
  const result = await db.query<{kind:string}>('select kind from public.support_events order by sequence');
  expect(result.rows.map(r => r.kind)).toEqual(['created','reply','completed','reopened','reply']);
  await db.exec('reset role');
  expect(await scalar('select count(*) as value from public.email_events')).toBe(5);
});
it('keeps read positions independent and does not read activity beyond the displayed snapshot', async () => {
  await setupUser(); const ticket = await mutate('created', null, 'Help');
  await actor(admin);
  expect(await scalar('select public.support_unread(true) as value')).toBe(1);
  await db.query('select public.support_mark_read($1,1)', [ticket]);
  expect(await scalar('select public.support_unread(true) as value')).toBe(0);
  await actor(owner); expect(await scalar('select public.support_unread(true) as value')).toBe(1);
  await mutate('reply', ticket, 'New activity');
  await actor(admin); await db.query('select public.support_mark_read($1,1)', [ticket]);
  expect(await scalar('select public.support_unread(true) as value')).toBe(1);
  await actor(user); expect(await scalar('select public.support_unread(false) as value')).toBe(1);
  await expect(db.query('select public.support_mark_read($1,100)', [ticket])).rejects.toThrow('INVALID_SEQUENCE');
  await db.exec('reset role');
  await db.query("insert into public.account_ban_state values($1,now()+interval '1 day')", [user]);
  await actor(user); expect(await scalar('select count(*) as value from public.support_tickets')).toBe(0);
  await expect(mutate('reply', ticket, 'Blocked')).rejects.toThrow('PERMISSION_DENIED');
});
it('queues opted-in admins and requester updates once, and rechecks eligibility at dispatch', async () => {
  await setupUser(); const ticket = await mutate('created', null, 'Private body never goes in email');
  await db.exec('reset role');
  await db.query('select public.email_preferences_save($1,$1,$2)', [admin, { signup:false, organization:false, review:false, failure:false, support:true }]);
  await db.exec('select public.email_expand_events(); select public.email_expand_events();');
  expect((await db.query('select recipient,event_type from public.email_jobs')).rows).toEqual([{recipient:'admin@example.com',event_type:'support'}]);
  expect(JSON.stringify((await db.query('select payload from public.email_jobs')).rows)).not.toContain('Private body');
  await actor(admin); await mutate('reply', ticket, 'Private admin reply'); await mutate('completed', ticket);
  await db.exec('reset role'); await db.exec('select public.email_expand_events()');
  expect(await scalar("select count(*) as value from public.email_jobs where recipient='user@example.com' and event_type='support_user'")).toBe(2);
  await db.query('update public.profiles set app_admin=false where id=$1', [admin]);
  expect(await scalar("select public.support_email_allowed($1,(select event_target from public.email_jobs where event_type='support'),'admin@example.com',true) as value", [admin])).toBe(false);
  await db.query('select public.email_worker_lock($1)', [worker]);
  expect((await db.query('select * from public.email_claim($1,false,false,100)', [worker])).rows).toHaveLength(0);
  await db.query('select * from public.email_claim($1,false,true,100)', [worker]);
  expect(await scalar("select status as value from public.email_jobs where event_type='support'")).toBe('cancelled');
  expect(await scalar('select count(*) as value from public.support_tickets')).toBe(1);
});
it('paginates own history, filters completed tickets, and rejects anonymous calls', async () => {
  await setupUser();
  for (let i=0; i<26; i++) await mutate('created', null, `Problem ${i}`);
  const list = await scalar("select public.support_list(false,'open',0) as value") as {tickets: {id:string}[]; total:number};
  expect(list.tickets).toHaveLength(25); expect(list.total).toBe(26);
  expect((await scalar("select public.support_list(false,'open',25) as value") as {tickets:unknown[]}).tickets).toHaveLength(1);
  await actor(admin); await mutate('completed', list.tickets[0].id);
  await actor(user);
  expect((await scalar("select public.support_list(false,'completed',0) as value") as {total:number}).total).toBe(1);
  await db.exec('reset role; set role anon');
  await expect(scalar('select public.support_list() as value')).rejects.toThrow(/permission denied/);
});
