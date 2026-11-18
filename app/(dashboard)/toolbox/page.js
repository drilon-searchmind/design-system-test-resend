import { auth } from "@/auth";
import { WorkspacePlaceholder } from "@/components/crm/workspace-placeholder";
import { ToolboxHub } from "@/components/toolbox/toolbox-hub";
import { sessionUserIsAdmin } from "@/lib/auth/session-admin";
import { listToolboxTools } from "@/lib/server/toolbox-data";

export const metadata = { title: "Toolbox · Searchmind 1337 OS" };

export default async function ToolboxPage() {
  const session = await auth();
  const isAdmin = await sessionUserIsAdmin(session);
  const { tools } = await listToolboxTools({ includeAdminOnly: isAdmin });

  return (
    <WorkspacePlaceholder title="Toolbox" description="Alle bureauets interne værktøjer samlet ét sted.">
      <ToolboxHub tools={tools} isAdmin={isAdmin} />
    </WorkspacePlaceholder>
  );
}
