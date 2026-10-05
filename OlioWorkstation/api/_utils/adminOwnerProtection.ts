import type { AdminResource } from "./adminResources.js";

export async function protectedOwnerRows(service: any, resource: AdminResource, rows: Record<string, any>[]) {
  const ownerFields = resource.key === "users" ? ["id"] : ["user_id", "owner_id", "created_by", "actor_id", "target_user_id"];
  const userIds = [...new Set(rows.flatMap(row => ownerFields.map(key => row[key])).filter(Boolean))];
  const protectedIds = new Set<string>();
  if (userIds.length) {
    const { data, error } = await service.from("profiles").select("id").eq("app_owner", true).in("id", userIds);
    if (error) throw error;
    for (const owner of data || []) protectedIds.add(owner.id);
  }
  const projects = [...new Set(rows.map(row => row.project_id).filter(Boolean))];
  const protectedProjects = new Set<string>();
  if (projects.length) {
    const { data, error } = await service.from("projects").select("id,user_id").in("id", projects);
    if (error) throw error;
    const projectOwners = (data || []).map((project: any) => project.user_id).filter(Boolean);
    if (projectOwners.length) {
      const { data: owners, error: ownerError } = await service.from("profiles").select("id").eq("app_owner", true).in("id", projectOwners);
      if (ownerError) throw ownerError;
      const ids = new Set((owners || []).map((owner: any) => owner.id));
      for (const project of data || []) if (ids.has(project.user_id)) protectedProjects.add(project.id);
    }
  }
  return rows.map(row => row.app_owner === true || ownerFields.some(key => protectedIds.has(row[key])) || protectedProjects.has(row.project_id));
}

