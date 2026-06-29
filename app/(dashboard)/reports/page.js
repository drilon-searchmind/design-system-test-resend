import { WorkspacePlaceholder } from "@/components/crm/workspace-placeholder";

export const metadata = { title: "Rapporter · 1337-crm by Searchmind" };

export default function ReportsPage() {
  return (
    <WorkspacePlaceholder
      title="Rapporter"
      description="Eksport og planlagte rapporter — read-only views på aggregerede data."
    />
  );
}
