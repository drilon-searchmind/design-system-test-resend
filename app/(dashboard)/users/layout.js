import { requireAdminPage } from "@/lib/server/require-admin";

/** Admin-only section: non-admins are redirected to Pulse. */
export default async function AdminOnlyLayout({ children }) {
  await requireAdminPage();
  return children;
}
