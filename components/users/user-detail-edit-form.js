"use client";

import { ACCESS_TIERS } from "@/lib/constants/access-tiers";
import { ALL_KNOWN_DEPARTMENTS } from "@/lib/crm/dept-keys";
import { cn } from "@/lib/utils";

import { clientEditInputClass } from "@/components/clients/client-detail-edit-actions";

/** @typedef {import('@/lib/crm/user-edit-utils').UserEditDraft} UserEditDraft */

/**
 * @param {{
 *   draft: UserEditDraft;
 *   onChange: (next: UserEditDraft) => void;
 * }} props
 */
export function UserDetailEditForm({ draft, onChange }) {
  /** @param {Partial<UserEditDraft>} patch */
  function patchDraft(patch) {
    onChange({ ...draft, ...patch });
  }

  /** @param {keyof UserEditDraft} field */
  function setField(field, value) {
    onChange({ ...draft, [field]: value });
  }

  /** @param {string} deptId */
  function toggleDiscipline(deptId) {
    const set = new Set(draft.disciplineKeys);
    if (set.has(deptId)) set.delete(deptId);
    else set.add(deptId);
    patchDraft({ disciplineKeys: [...set] });
  }

  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <div className="tally-panel p-4 md:p-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Konto</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Navn" required>
            <input value={draft.name} onChange={(e) => setField("name", e.target.value)} className={clientEditInputClass} />
          </Field>
          <Field label="Email" required>
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setField("email", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Profilbillede (URL)">
            <input value={draft.image} onChange={(e) => setField("image", e.target.value)} className={clientEditInputClass} />
          </Field>
          <Field label="Adgangsniveau">
            <select
              value={draft.accessTier}
              onChange={(e) => setField("accessTier", e.target.value)}
              className={clientEditInputClass}
            >
              <option value={ACCESS_TIERS.INTERNAL_FULL}>Intern (fuld adgang)</option>
              <option value={ACCESS_TIERS.EXTERNAL_LIMITED}>Ekstern (begrænset)</option>
            </select>
          </Field>
          <Field label="Provisionering">
            <select
              value={draft.provisionedVia}
              onChange={(e) => setField("provisionedVia", e.target.value)}
              className={clientEditInputClass}
            >
              <option value="workspace_google_sso">Workspace Google SSO</option>
              <option value="invite">Invitation</option>
              <option value="admin_seed">Seed / admin</option>
              <option value="migration">Migration</option>
            </select>
          </Field>
          <Field label="ClickUp member-id">
            <input
              value={draft.clickUpMemberId}
              onChange={(e) => setField("clickUpMemberId", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
        </div>
      </div>

      <div className="tally-panel p-4 md:p-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Team roster</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Roster-nøgle">
            <input
              value={draft.teamMemberKey}
              onChange={(e) => setField("teamMemberKey", e.target.value.trim().toLowerCase())}
              className={clientEditInputClass}
              placeholder="aooc"
            />
          </Field>
          <Field label="Rolle / titel">
            <input
              value={draft.roleTitle}
              onChange={(e) => setField("roleTitle", e.target.value)}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Primær disciplin">
            <select
              value={draft.departmentKey}
              onChange={(e) => setField("departmentKey", e.target.value)}
              className={clientEditInputClass}
            >
              <option value="">—</option>
              {ALL_KNOWN_DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.short})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Avatar (initialer)">
            <input
              value={draft.avatarInitials}
              maxLength={4}
              onChange={(e) => setField("avatarInitials", e.target.value.toUpperCase())}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Hue (0–360)">
            <input
              type="number"
              min={0}
              max={360}
              value={draft.hue}
              onChange={(e) => setField("hue", Number(e.target.value))}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Timer pr. uge">
            <input
              type="number"
              min={1}
              max={60}
              value={draft.weeklyHours}
              onChange={(e) => setField("weeklyHours", Number(e.target.value))}
              className={clientEditInputClass}
            />
          </Field>
          <Field label="Aktiv på roster">
            <label className="flex h-10 items-center gap-2 font-sans text-[13px] text-fg">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setField("active", e.target.checked)}
                className="size-4 rounded border-border"
              />
              Aktiv
            </label>
          </Field>
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Discipliner</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ALL_KNOWN_DEPARTMENTS.map((d) => {
              const on = draft.disciplineKeys.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDiscipline(d.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 font-sans text-[11px] transition-colors",
                    on ?
                      "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
                    : "border-border text-fg-muted hover:bg-surface-muted",
                  )}
                >
                  {d.short}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{ label: string; required?: boolean; children: import('react').ReactNode }} props
 */
function Field({ label, required, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-sans text-[11px] font-medium text-fg-soft">
        {label}
        {required ? <span className="text-agency-bad"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
