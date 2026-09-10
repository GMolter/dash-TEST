import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface Profile {
  id: string;
  org_id: string | null;
  role: 'member' | 'admin' | 'owner';
  app_admin: boolean | null;
  display_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

interface Organization {
  id: string;
  name: string;
  code: string;
  owner_id: string;
  created_at: string;
}

type OrgMember = Profile;

interface OrgContextType {
  profile: Profile | null;
  organization: Organization | null;
  members: OrgMember[];
  loading: boolean;
  error: string | null;
  refreshOrg: (options?: { silent?: boolean }) => Promise<void>;
  joinOrg: (code: string) => Promise<{ success: boolean; error?: string }>;
  createOrg: (name: string) => Promise<{ success: boolean; error?: string }>;
  updateOrg: (updates: Partial<Organization>) => Promise<{ success: boolean; error?: string }>;
  regenerateCode: () => Promise<{ success: boolean; newCode?: string; error?: string }>;
  leaveOrg: () => Promise<{ success: boolean; error?: string }>;
  deleteOrg: () => Promise<{ success: boolean; error?: string }>;
  updateMemberRole: (memberId: string, newRole: 'member' | 'admin' | 'owner') => Promise<{ success: boolean; error?: string }>;
  removeMember: (memberId: string) => Promise<{ success: boolean; error?: string }>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

const ORG_CACHE_KEY = 'olio-org-cache-v1';
const ORG_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

type OrgCache = {
  userId: string;
  profile: Profile | null;
  organization: Organization | null;
  members: OrgMember[];
  updatedAt: number;
};

function readOrgCache(userId: string): OrgCache | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(ORG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrgCache;
    if (!parsed || parsed.userId !== userId) return null;
    if (!parsed.updatedAt || Date.now() - parsed.updatedAt > ORG_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeOrgCache(userId: string, profile: Profile | null, organization: Organization | null, members: OrgMember[]) {
  try {
    if (typeof window === 'undefined') return;
    const payload: OrgCache = {
      userId,
      profile,
      organization,
      members,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(ORG_CACHE_KEY, JSON.stringify(payload));
  } catch {}
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshOrg = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent;
    if (authLoading) {
      if (!silent) setLoading(true);
      return;
    }
    if (!user) {
      setProfile(null);
      setOrganization(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      setError(null);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        setProfile(null);
        setOrganization(null);
        setMembers([]);
        setError('Profile missing. Please sign in again or contact support.');
        setLoading(false);
        await signOut();
        return;
      }

      const resolvedProfile = profileData as Profile;
      setProfile(resolvedProfile);

      if (resolvedProfile.org_id) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', resolvedProfile.org_id)
          .single();

        if (orgError) throw orgError;

        setOrganization(orgData);

        const { data: membersData, error: membersError } = await supabase
          .from('profiles')
          .select('*')
          .eq('org_id', resolvedProfile.org_id);

        if (membersError) throw membersError;

        setMembers(membersData || []);
        writeOrgCache(user.id, resolvedProfile, orgData, membersData || []);
      } else {
        setOrganization(null);
        setMembers([]);
        writeOrgCache(user.id, resolvedProfile, null, []);
      }

      setLoading(false);
    } catch (err) {
      console.error('Org refresh error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load organization');
      setLoading(false);
    }
  }, [user, authLoading, signOut]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setOrganization(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    const cached = readOrgCache(user.id);
    if (cached) {
      setProfile(cached.profile);
      setOrganization(cached.organization);
      setMembers(cached.members || []);
      setLoading(false);
      refreshOrg({ silent: true });
      return;
    }

    refreshOrg();
  }, [authLoading, user, refreshOrg]);

  const completeSetup = async (
    operation: 'join_organization_by_code' | 'create_organization_with_owner',
    args: { p_code: string } | { p_name: string },
  ) => {
    if (!user) return { success: false, error: 'Please sign in again.' };
    try {
      setError(null);
      const { data, error: setupError } = await supabase.rpc(operation, args);
      if (setupError) throw setupError;
      if (!data?.profile || !data?.organization || data.profile.id !== user.id || data.profile.org_id !== data.organization.id) {
        throw new Error('Organization setup did not complete. Please try again.');
      }
      // Use committed membership immediately, even if the roster refresh fails.
      setProfile(data.profile);
      setOrganization(data.organization);
      setMembers([data.profile]);
      writeOrgCache(user.id, data.profile, data.organization, [data.profile]);
      await refreshOrg({ silent: true });
      return { success: true };
    } catch (err) {
      // PostgREST errors are plain objects, not instances of Error.
      const detail = typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string'
        ? err.message : 'Could not complete organization setup. Please try again.';
      const code = typeof err === 'object' && err !== null && 'code' in err ? err.code : undefined;
      const errorMessage = code === 'PGRST202'
        ? 'Organization setup is temporarily unavailable. Please contact support.'
        : detail;
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const joinOrg = async (code: string) => {
    if (!/^\d{4}$/.test(code.trim())) return { success: false, error: 'Organization code must be 4 digits.' };
    return completeSetup('join_organization_by_code', { p_code: code.trim() });
  };

  const createOrg = async (name: string) => {
    if (!name.trim() || name.trim().length > 100) return { success: false, error: 'Organization name must be between 1 and 100 characters.' };
    return completeSetup('create_organization_with_owner', { p_name: name.trim() });
  };

  const updateOrg = async (updates: Partial<Organization>) => {
    if (!organization) return { success: false, error: 'No organization' };
    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Permission denied' };
    }

    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organization.id);

      if (updateError) throw updateError;

      await refreshOrg();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update organization';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const regenerateCode = async () => {
    if (!organization) return { success: false, error: 'No organization' };
    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Permission denied' };
    }

    try {
      setError(null);

      let code = '';
      let isUnique = false;

      while (!isUnique) {
        code = Math.floor(1000 + Math.random() * 9000).toString();
        const { data: existing } = await supabase
          .from('organizations')
          .select('id')
          .eq('code', code)
          .maybeSingle();

        if (!existing) isUnique = true;
      }

      const { error: updateError } = await supabase
        .from('organizations')
        .update({ code })
        .eq('id', organization.id);

      if (updateError) throw updateError;

      await refreshOrg();
      return { success: true, newCode: code };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate code';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const leaveOrg = async () => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ org_id: null, role: 'member' })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshOrg();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave organization';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const deleteOrg = async () => {
    if (!organization) return { success: false, error: 'No organization' };
    if (!profile || profile.role !== 'owner') {
      return { success: false, error: 'Only the owner can delete the organization' };
    }

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organization.id);

      if (deleteError) throw deleteError;

      await refreshOrg();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete organization';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'member' | 'admin' | 'owner') => {
    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Permission denied' };
    }

    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', memberId);

      if (updateError) throw updateError;

      await refreshOrg();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update member role';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const removeMember = async (memberId: string) => {
    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Permission denied' };
    }

    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ org_id: null, role: 'member' })
        .eq('id', memberId);

      if (updateError) throw updateError;

      await refreshOrg();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove member';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  return (
    <OrgContext.Provider
      value={{
        profile,
        organization,
        members,
        loading,
        error,
        refreshOrg,
        joinOrg,
        createOrg,
        updateOrg,
        regenerateCode,
        leaveOrg,
        deleteOrg,
        updateMemberRole,
        removeMember,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}
