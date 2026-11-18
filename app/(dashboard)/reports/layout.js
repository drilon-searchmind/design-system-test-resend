import { requireAdminPage } from "@/lib/server/require-admin";

/** Hidden from the menu for now; only admins can open it by URL. */
export default async function ReportsLayout({ children }) {
  await requireAdminPage();
  return children;
}
