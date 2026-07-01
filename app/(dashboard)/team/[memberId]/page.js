import { redirect, notFound } from "next/navigation";

import { memberProfileHref, routes, userAccountHref } from "@/config/routes";
import { getTeamMemberById } from "@/lib/crm/team-utils";
import { formatUserAccountId } from "@/lib/crm/user-account-id";
import TeamMember from "@/lib/db/models/team-member";
import { connectDb } from "@/lib/db/mongoose";

/** @param {{ params: Promise<{ memberId: string }> }} props */
export default async function TeamMemberRedirectPage({ params }) {
  const { memberId } = await params;
  const key = decodeURIComponent(String(memberId ?? "").trim());
  if (!key) notFound();

  try {
    await connectDb();
    const member = await TeamMember.findOne({ key }).select("userId").lean();
    if (member?.userId) {
      redirect(userAccountHref(formatUserAccountId(member.userId)));
    }
  } catch {
    /* demo / cold start — fall through */
  }

  const demoMember = getTeamMemberById(key);
  if (demoMember) {
    redirect(memberProfileHref({ id: demoMember.id, userAccountId: `u-${demoMember.id}` }));
  }

  redirect(routes.team);
}
