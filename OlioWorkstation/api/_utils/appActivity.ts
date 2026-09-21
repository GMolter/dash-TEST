export async function attachAppActivity(service: any, rows: Record<string, any>[]) {
  if (!rows.length) return rows;
  const { data, error } = await service.from("user_app_activity").select("user_id,last_active_at").in("user_id", rows.map((row) => row.id));
  if (error && !["42P01", "PGRST205"].includes(error.code)) throw error;
  const activity = new Map((data || []).map((item: any) => [item.user_id, item.last_active_at]));
  return rows.map((row) => ({
    ...row,
    last_active_at: activity.get(row.id) || null,
    _admin_activity_status: error ? "unavailable" : activity.has(row.id) ? "tracked" : "pending",
  }));
}
