"use client";

import { TeamMemberMultiSelect } from "@/components/tasks/team-member-multi-select";

/**
 * @param {{
 *   authors: Array<{ id: string; name: string; avatar: string; hue: number; image?: string }>;
 *   selected: Set<string>;
 *   onChange: (next: Set<string>) => void;
 *   mineAuthorKey?: string;
 * }} props
 */
export function KbAuthorFilter({ authors, selected, onChange, mineAuthorKey = "" }) {
  const team = authors.map((a) => ({
    id: a.id,
    name: a.name,
    avatar: a.avatar,
    hue: a.hue,
    image: a.image,
  }));

  return (
    <TeamMemberMultiSelect
      team={team}
      selected={selected}
      onChange={onChange}
      mineAssigneeKey={mineAuthorKey}
      emptyLabel="Ingen forfattere"
      allSelectedLabel="Alle forfattere"
      countLabel={(n) => `${n} forfattere`}
      showQuickActions
      menuPlacement="inline"
    />
  );
}

/** @param {Array<{ id: string }>} authors */
export function defaultKbAuthorSelection(authors) {
  return new Set(authors.map((a) => a.id));
}
