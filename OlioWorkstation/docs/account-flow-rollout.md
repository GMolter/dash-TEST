# Account flow rollout

Apply `supabase/migrations/20260910120000_create_auth_profiles_atomically.sql` to the target database **before deploying the frontend**. The frontend now relies on the database trigger to provision profiles, including for accounts awaiting email confirmation.

The migration inserts only missing profiles for existing auth users, with role `member`; it does not overwrite existing profiles, organization memberships, or roles. New account/profile creation runs in one transaction. If profile creation fails, signup fails instead of silently leaving an orphaned account.

In a local Supabase test environment, run:

```sh
supabase test db supabase/tests/auth_profiles.test.sql
```

After applying the migration, this read-only query should return zero:

```sql
select count(*) as accounts_missing_profiles
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
```

Verify a new signup both with email confirmation enabled and disabled, then sign in with an existing account. An invalid-credentials response offers account creation without claiming the email is unknown: Supabase intentionally returns the same error for unknown accounts and incorrect passwords. Network, confirmation, and other errors do not offer account creation.
