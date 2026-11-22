import { hasAdminSession } from "./admin-auth"

export async function requireAdminSession() {
  if (!(await hasAdminSession())) throw new Response("Unauthorized", { status: 401 })
}
