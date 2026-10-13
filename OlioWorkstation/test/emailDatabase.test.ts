// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
  create function auth.uid() returns uuid language sql as $$select null::uuid$$;
  create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,encrypted_password text);
  create table public.profiles(id uuid primary key references auth.users(id),app_admin boolean default true,app_owner boolean default false);
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
}, 30000);
beforeEach(async () => {
  await db.exec(`truncate public.email_attempts,public.email_jobs,public.email_messages,public.email_drafts,public.email_attachments,public.email_events,public.email_preferences,public.email_cooldowns,public.admin_audit_log,public.admin_permission_grants,public.account_ban_state,public.profiles,auth.users cascade;
  update public.email_health set worker_token=null,worker_until=null,paused=false,error_code=null;
  insert into auth.users values('${owner}','owner@example.com',now(),'original'),('${admin}','admin@example.com',now(),'original');
  insert into public.profiles values('${owner}',true,true),('${admin}',true,false);
  delete from public.email_events;`);
});
afterAll(async () => {
  await db?.close();
});
const payload = {
  subject: 'Hello',
  html: '<p>Hello</p>',
  recipients: ['person@example.com'],
  attachment_ids: [],
};
it('copies subscribed owner notifications once and rechecks owner status before sending', async () => {
  await db.query('update auth.users set email=$1 where id=$2', ['gavin@olio.one', owner]);
  await db.query('insert into public.email_preferences(user_id,signup) values($1,true)', [owner]);
  await db.exec("insert into public.email_events(event_type,target_id,dedupe_key) values('signup',gen_random_uuid(),'owner-copy-test'); select public.email_expand_events(); select public.email_expand_events();");
  const jobs = await db.query<{recipient:string}>('select recipient from public.email_jobs order by recipient');
  expect(jobs.rows.map(row => row.recipient)).toEqual(['gavin@olio.one', 'gmolter8@gmail.com']);
  await db.query('select public.email_worker_lock($1)', [worker]);
  const first = await db.query('select recipient from public.email_claim($1,false,true,100)', [worker]);
  const second = await db.query('select recipient from public.email_claim($1,false,true,100)', [worker]);
  expect([...first.rows, ...second.rows].map(row => row.recipient).sort()).toEqual(['gavin@olio.one', 'gmolter8@gmail.com']);
  await db.exec("insert into public.email_events(event_type,target_id,dedupe_key) values('signup',gen_random_uuid(),'owner-copy-revoke'); select public.email_expand_events();");
  await db.query('update public.profiles set app_owner=false where id=$1', [owner]);
  await db.query('select * from public.email_claim($1,false,true,100)', [worker]);
  await db.query('select * from public.email_claim($1,false,true,100)', [worker]);
  expect(await scalar("select status as value from public.email_jobs where recipient='gmolter8@gmail.com' and status<>'sending'")).toBe('cancelled');
});
async function submit(
  who = owner,
  key = randomUUID(),
  revision = 1,
  draftId?: string,
) {
  const id =
    draftId ||
    (await scalar(
      'select (public.email_save_draft($1,null,0,$2)).id as value',
      [who, payload],
    ));
  const snapshot = {
    subject: 'Hello',
    html: '<p>Hello</p>',
    text: 'Hello',
    recipients: payload.recipients,
    timezone: 'UTC',
    scheduled_at: new Date(Date.now() - 1000).toISOString(),
  };
  return {
    id: (await scalar(
      'select public.email_submit($1,$2,$3,$4,$5,$6) as value',
      [who, id, revision, key, 'fingerprint', snapshot],
    )) as string,
    draft: id,
  };
}
async function claim(auth = true, manual = true) {
  return (
    await db.query<{
      id: string;
      lease_token: string;
      status: string;
      kind: string;
    }>('select * from public.email_claim($1,$2,$3,100)', [worker, auth, manual])
  ).rows;
}
async function lock() {
  return scalar('select public.email_worker_lock($1) as value', [worker]);
}
describe('Email migration and durable queue', () => {
  it('expires auth payloads during maintenance even while SMTP is paused', async () => {
    await db.exec("update public.email_health set paused=true; insert into public.email_jobs(recipient,kind,encrypted_payload,expires_at) values('auth@example.com','auth','encrypted',now()-interval '1 minute'); select public.email_cleanup();");
    expect(await scalar('select status as value from public.email_jobs')).toBe('expired');
    expect(await scalar('select encrypted_payload as value from public.email_jobs')).toBe(null);
  });
  it('creates owner failure alerts for authentication failures without retaining tokens', async () => {
    await db.exec("insert into public.email_jobs(recipient,kind,status,lease_token,attempts,encrypted_payload) values('auth@example.com','auth','sending','33333333-3333-4333-8333-333333333333',1,'encrypted')");
    const job = await scalar('select id as value from public.email_jobs');
    await db.query("select public.email_finish($1,$2,'failed','SMTP_REJECTED',false)", [job, worker]);
    expect(await scalar("select count(*)::int as value from public.email_events where event_type='failure'")).toBe(1);
    expect(await scalar('select encrypted_payload as value from public.email_jobs')).toBe(null);
  });
  it('restricts all email tables and RPCs from browser roles', async () => {
    expect(
      await scalar(
        "select has_table_privilege('authenticated','public.email_jobs','SELECT') as value",
      ),
    ).toBe(false);
    expect(
      await scalar(
        "select has_function_privilege('anon','public.email_claim(uuid,boolean,boolean,integer)','EXECUTE') as value",
      ),
    ).toBe(false);
    expect(
      await scalar(
        "select has_function_privilege('service_role','public.email_claim(uuid,boolean,boolean,integer)','EXECUTE') as value",
      ),
    ).toBe(true);
    expect(
      await scalar(
        "select bool_and(relrowsecurity) as value from pg_class where relname like 'email_%' and relkind='r'",
      ),
    ).toBe(true);
  });
  it('requires explicit grants and checks bans', async () => {
    await expect(submit(admin)).rejects.toThrow('PERMISSION_DENIED');
    await db.exec(
      `insert into public.admin_permission_grants values('${admin}','sections.email.read'),('${admin}','email.read'),('${admin}','email.send');`,
    );
    await expect(submit(admin)).resolves.toHaveProperty('id');
    await db.exec(
      `insert into public.account_ban_state values('${admin}',now()+interval '1 hour');`,
    );
    await expect(submit(admin)).rejects.toThrow('PERMISSION_DENIED');
  });
  it('atomically snapshots, removes the draft, and deduplicates submission retries', async () => {
    const key = randomUUID(),
      first = await submit(owner, key);
    expect(
      await scalar('select count(*)::int as value from public.email_drafts'),
    ).toBe(0);
    expect((await submit(owner, key, 1, first.draft as string)).id).toBe(
      first.id,
    );
    expect(
      await scalar('select count(*)::int as value from public.email_jobs'),
    ).toBe(1);
    expect(
      await scalar('select count(*)::int as value from public.admin_audit_log'),
    ).toBe(1);
  });
  it('rejects stale revisions and another admin’s draft', async () => {
    const draft = await scalar(
      'select (public.email_save_draft($1,null,0,$2)).id as value',
      [owner, payload],
    );
    await expect(
      submit(owner, randomUUID(), 2, draft as string),
    ).rejects.toThrow('DRAFT_CHANGED');
    await db.exec(
      `insert into public.admin_permission_grants values('${admin}','sections.email.read'),('${admin}','email.read'),('${admin}','email.send');`,
    );
    await expect(
      submit(admin, randomUUID(), 1, draft as string),
    ).rejects.toThrow('DRAFT_CHANGED');
  });
  it('admits only one worker and claims each delivery once', async () => {
    await submit();
    expect(await lock()).toBe(true);
    expect(
      await scalar('select public.email_worker_lock($1) as value', [
        randomUUID(),
      ]),
    ).toBe(false);
    expect(await claim()).toHaveLength(1);
    expect(await claim()).toHaveLength(0);
  });
  it('prioritizes authentication and supports independent delivery switches', async () => {
    await submit();
    await db.exec(
      "insert into public.email_jobs(recipient,kind,encrypted_payload) values('auth@example.com','auth','encrypted')",
    );
    await lock();
    expect((await claim())[0].kind).toBe('auth');
    expect(await claim(true, false)).toHaveLength(0);
    expect((await claim(false, true))[0].kind).toBe('manual');
  });
  it('cancels remaining deliveries when sender access is revoked', async () => {
    await submit();
    await db.exec(
      `update public.profiles set app_admin=false where id='${owner}'`,
    );
    await lock();
    expect(await claim()).toHaveLength(0);
    expect(await scalar('select status as value from public.email_jobs')).toBe(
      'cancelled',
    );
  });
  it('uses uncertain outcome after a lost lease without automatic resend', async () => {
    await submit();
    await lock();
    const [job] = await claim();
    await db.exec(
      "update public.email_jobs set lease_until=now()-interval '1 second'",
    );
    expect(await claim()).toHaveLength(0);
    expect(await scalar('select status as value from public.email_jobs')).toBe(
      'unknown',
    );
    await expect(
      db.query('select public.email_retry($1,$2,false)', [owner, job.id]),
    ).rejects.toThrow('CONFIRM_DUPLICATE_RISK');
    await db.query('select public.email_retry($1,$2,true)', [owner, job.id]);
    expect(await claim()).toHaveLength(1);
  });
  it('preserves claimed deliveries on cancellation and disallows returning started mail to draft', async () => {
    const message = await submit();
    await lock();
    await claim();
    await expect(
      db.query('select public.email_cancel($1,$2,true)', [owner, message.id]),
    ).rejects.toThrow('DISPATCH_ALREADY_STARTED');
    await db.query('select public.email_cancel($1,$2,false)', [
      owner,
      message.id,
    ]);
    expect(await scalar('select status as value from public.email_jobs')).toBe(
      'sending',
    );
  });
  it('makes return-to-draft idempotent before dispatch', async () => {
    const message = await submit();
    await db.query('select public.email_cancel($1,$2,true)', [
      owner,
      message.id,
    ]);
    await db.query('select public.email_cancel($1,$2,true)', [
      owner,
      message.id,
    ]);
    expect(
      await scalar('select count(*)::int as value from public.email_drafts'),
    ).toBe(1);
  });
  it('backs off retries and discards auth credentials on terminal outcomes', async () => {
    await db.exec(
      "insert into public.email_jobs(recipient,kind,encrypted_payload) values('auth@example.com','auth','encrypted')",
    );
    await lock();
    const [job] = await claim();
    await db.query(
      "select public.email_finish($1,$2,'retry','SMTP_TEMPORARY',false)",
      [job.id, job.lease_token],
    );
    expect(await claim()).toHaveLength(0);
    expect(
      await scalar('select encrypted_payload as value from public.email_jobs'),
    ).toBe('encrypted');
    await db.exec(
      "update public.email_jobs set available_at=now()-interval '1 second'",
    );
    const [next] = await claim();
    await db.query("select public.email_finish($1,$2,'accepted',null,false)", [
      next.id,
      next.lease_token,
    ]);
    expect(
      await scalar('select encrypted_payload as value from public.email_jobs'),
    ).toBe(null);
  });
  it('expires auth tokens and allows no account FK in the hook queue', async () => {
    await db.query('select public.email_auth_enqueue($1)', [
      [
        {
          recipient: 'not-created@example.com',
          encrypted_payload: 'private',
          dedupe_key: 'event',
          expires_at: '2020-01-01T00:00:00Z',
        },
      ],
    ]);
    await lock();
    expect(await claim()).toHaveLength(0);
    expect(await scalar('select status as value from public.email_jobs')).toBe(
      'expired',
    );
    expect(
      await scalar('select encrypted_payload as value from public.email_jobs'),
    ).toBe(null);
  });
  it('defaults subscriptions off, expands once, and rechecks subscriptions at dispatch', async () => {
    await db.exec('insert into public.organizations values(gen_random_uuid())');
    await db.exec('select public.email_expand_events()');
    expect(
      await scalar('select count(*)::int as value from public.email_jobs'),
    ).toBe(0);
    await db.query('select public.email_preferences_save($1,$1,$2)', [
      owner,
      { signup: false, organization: true, review: false, failure: false },
    ]);
    await db.exec(
      'insert into public.organizations values(gen_random_uuid()); select public.email_expand_events(); select public.email_expand_events();',
    );
    expect(
      await scalar('select count(*)::int as value from public.email_jobs'),
    ).toBe(1);
    await db.exec('update public.email_preferences set organization=false');
    await lock();
    expect(await claim()).toHaveLength(0);
  });
  it('records welcome only once and password changes transactionally', async () => {
    await db.exec(
      `update auth.users set email_confirmed_at=null where id='${admin}'; update auth.users set email_confirmed_at=now() where id='${admin}'; update auth.users set email_confirmed_at=null where id='${admin}'; update auth.users set email_confirmed_at=now(),encrypted_password='changed' where id='${admin}';`,
    );
    expect(
      await scalar(
        "select count(*)::int as value from public.email_events where event_type='welcome'",
      ),
    ).toBe(1);
    expect(
      await scalar(
        "select count(*)::int as value from public.email_events where event_type='password'",
      ),
    ).toBe(1);
  });
  it('failure alerts do not recursively generate more failure alerts', async () => {
    await db.exec(
      "insert into public.email_jobs(recipient,kind,event_type,status,lease_token,attempts) values('admin@example.com','notification','failure','sending','33333333-3333-4333-8333-333333333333',1)",
    );
    const job = await scalar('select id as value from public.email_jobs');
    await db.query(
      "select public.email_finish($1,$2,'failed','SMTP_REJECTED',false)",
      [job, worker],
    );
    expect(
      await scalar('select count(*)::int as value from public.email_events'),
    ).toBe(0);
  });
  it('audits owner preference changes and rejects nonowners changing others', async () => {
    const preferences = {
      signup: true,
      organization: false,
      review: false,
      failure: false,
    };
    await expect(
      db.query('select public.email_preferences_save($1,$2,$3)', [
        admin,
        owner,
        preferences,
      ]),
    ).rejects.toThrow('PERMISSION_DENIED');
    await db.query('select public.email_preferences_save($1,$2,$3)', [
      owner,
      admin,
      preferences,
    ]);
    expect(
      await scalar('select count(*)::int as value from public.admin_audit_log'),
    ).toBe(1);
  });
  it('preserves pending scheduled content beyond the ordinary retention window', async () => {
    await submit();
    await db.exec(
      "update public.email_messages set created_at=now()-interval '31 days';select public.email_cleanup();",
    );
    expect(
      await scalar('select html as value from public.email_messages'),
    ).toBe('<p>Hello</p>');
    await db.exec(
      "update public.email_jobs set status='accepted';select public.email_cleanup();",
    );
    expect(
      await scalar('select html as value from public.email_messages'),
    ).toBe(null);
  });
});
