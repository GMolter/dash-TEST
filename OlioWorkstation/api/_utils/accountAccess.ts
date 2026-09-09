// Service-role endpoints bypass RLS, so they must also check current ban state.
export async function accountIsAllowed(service: any, userId: string): Promise<boolean> {
  const { data, error } = await service.from('account_ban_state').select('banned_until').eq('user_id', userId).maybeSingle();
  if (error) return false;
  if (!data?.banned_until) return true;
  const expiry = Date.parse(data.banned_until);
  return Number.isFinite(expiry) && expiry <= Date.now();
}
