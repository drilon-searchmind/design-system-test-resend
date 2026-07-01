import { notFound } from "next/navigation";

import { UserDetailPageClient } from "@/components/users/user-detail-page-client";
import { shellMainStudio } from "@/config/shell";
import { parseUserAccountId } from "@/lib/crm/user-account-id";
import { getAgencyUserById } from "@/lib/crm/users-utils";
import User from "@/lib/db/models/user";
import { connectDb } from "@/lib/db/mongoose";
import { cn } from "@/lib/utils";

/** @param {{ params: Promise<{ userId: string }> }} props */
export async function generateMetadata({ params }) {
  const { userId } = await params;
  const demo = getAgencyUserById(userId);
  if (demo) return { title: `${demo.name} · Brugerstyring · 1337-crm by Searchmind` };

  const oid = parseUserAccountId(userId);
  if (oid) {
    try {
      await connectDb();
      const doc = await User.findById(oid).select("name email").lean();
      const name = doc?.name ? String(doc.name) : doc?.email ? String(doc.email) : null;
      if (name) return { title: `${name} · Brugerstyring · 1337-crm by Searchmind` };
    } catch {
      /* Mongo utilgængelig */
    }
  }

  return { title: "Bruger · Brugerstyring · 1337-crm by Searchmind" };
}

/** @param {{ params: Promise<{ userId: string }> }} props */
export default async function UserAccountPage({ params }) {
  const { userId } = await params;

  const demo = getAgencyUserById(userId);
  const oid = parseUserAccountId(userId);
  if (!demo && !oid) notFound();

  return (
    <main className={cn(shellMainStudio)}>
      <UserDetailPageClient userId={userId} />
    </main>
  );
}
