/**
 * Kundenoter: fælles typer og kilde-labels (server + klient).
 *
 * Kilder i dag:
 * - `Note`-collection: manuelle noter fra CRM (`source: "manual"`) samt seed-data fra
 *   `seed-demo-from-static` / `seed-test-customer` (`source: "seed"` eller tom på ældre rækker).
 *   ClickUp-importen opretter/opdaterer én note pr. kunde fra feltet "🤝 Kundenoter" (`source: "clickup"`).
 * - `TaskComment`-collection: kommentarer på kundens opgaver, flettet ind i feedet.
 */

/**
 * @typedef {{
 *   id: string;
 *   kind: 'note' | 'task_comment';
 *   who: string;
 *   authorName?: string;
 *   authorUserId?: string;
 *   at: string;
 *   occurredAt?: string;
 *   type: string;
 *   body: string;
 *   source?: string;
 *   taskId?: string;
 *   taskTitle?: string;
 * }} ClientNoteItem
 */

export const NOTE_TYPE_LABELS = /** @type {Record<string, string>} */ ({
  note: "Note",
  call: "Opkald",
  meeting: "Møde",
  alert: "Advarsel",
  comment: "Kommentar",
});

export const NOTE_TYPE_OPTIONS = [
  { value: "note", label: "Note" },
  { value: "call", label: "Opkald" },
  { value: "meeting", label: "Møde" },
  { value: "alert", label: "Advarsel" },
];

/** @param {Pick<ClientNoteItem, 'kind' | 'source' | 'taskTitle'>} note */
export function noteSourceLabel(note) {
  if (note.kind === "task_comment") {
    return note.taskTitle ? `Opgavekommentar på "${note.taskTitle}"` : "Opgavekommentar";
  }
  const base =
    note.source === "manual" ? "Manuel note"
    : note.source === "clickup" ? "Fra ClickUp"
    : note.source === "demo" ? "Demo-data"
    : "Seed-/testdata";
  return note.taskTitle ? `${base} · opgave "${note.taskTitle}"` : base;
}

export const NOTE_BODY_MAX = 4000;

/**
 * Må brugeren rette/slette noten? Samme regel som serveren: forfatter eller admin.
 * Opgavekommentarer kan aldrig ændres her.
 * @param {Pick<ClientNoteItem, 'kind' | 'authorUserId'>} note
 * @param {{ userId?: string; isAdmin?: boolean }} viewer
 */
export function canManageNote(note, viewer) {
  if ((note.kind ?? "note") !== "note") return false;
  if (viewer.isAdmin) return true;
  return Boolean(viewer.userId && note.authorUserId && note.authorUserId === viewer.userId);
}

/**
 * Demo-noter fra `NOTES_BY_CLIENT` ("YYYY-MM-DD HH:mm") → samme form som database-feedet, nyeste først.
 * @param {Array<{ id: string; who: string; at: string; type: string; body: string }>} notes
 * @returns {ClientNoteItem[]}
 */
export function demoNoteItems(notes) {
  return notes
    .map((n) => {
      const [date = "", time = ""] = String(n.at ?? "").split(" ");
      const [y, m, d] = date.split("-");
      return {
        ...n,
        kind: /** @type {const} */ ("note"),
        source: "demo",
        at: y && m && d ? `${d}.${m}.${y}` : n.at,
        occurredAt: date ? `${date}T${time || "00:00"}:00` : undefined,
      };
    })
    .sort((a, b) => String(b.occurredAt ?? "").localeCompare(String(a.occurredAt ?? "")));
}
