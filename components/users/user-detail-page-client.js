"use client";

import { UserDetailShell } from "@/components/users/user-detail-shell";

/**
 * @param {{ userId: string }} props
 */
export function UserDetailPageClient({ userId }) {
  return <UserDetailShell userId={userId} />;
}
