/**
 * Rettigheder: hvad kun administratorer må. Håndhæves på serveren (API-routes) og vises som liste
 * i Indstillinger. Alt andet må alle loggede brugere.
 */

/**
 * Felter på en kunde som kun admins må ændre (arkivering og aftaleøkonomi m.m.).
 * Ændres feltet ikke i forhold til det gemte, afvises kaldet ikke (så redigeringsformularen virker for alle).
 */
export const CLIENT_ADMIN_ONLY_FIELDS = [
  "status",
  "terminatedAt",
  "churnReason",
  "churnNote",
  "retainerAmount",
  "oneOffWebAmount",
  "serviceAgreementAnnual",
  "serviceBudgets",
  "marketingStartMrr",
  "marketingUpsellMrr",
  "annualAdjustmentPct",
  "currency",
  "groupKey",
  "cvr",
  "slug",
  "customerClickUpId",
];

/** @param {unknown} v */
function normalize(v) {
  if (v == null || v === "") return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (v instanceof Map) return normalize(Object.fromEntries(v));
  if (Array.isArray(v)) return JSON.stringify(v.map(String).sort());
  if (typeof v === "object") {
    const o = /** @type {Record<string, unknown>} */ (v);
    const entries = Object.keys(o)
      .sort()
      .map((k) => [k, normalize(o[k])])
      .filter(([, x]) => x !== "" && x !== "0");
    return JSON.stringify(entries);
  }
  if (typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)))) {
    return String(Number(v));
  }
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return String(v);
}

/**
 * Hvilke admin-only felter ændrer `patch` i forhold til `existing`?
 * @param {Record<string, unknown>} patch
 * @param {Record<string, unknown>} existing
 * @returns {string[]}
 */
export function changedAdminClientFields(patch, existing) {
  return CLIENT_ADMIN_ONLY_FIELDS.filter(
    (f) => f in patch && normalize(patch[f]) !== normalize(existing[f]),
  );
}

/**
 * Oversigt over hvad administratorer kan, som almindelige brugere ikke kan (vises i Indstillinger).
 * @type {{ area: string; items: { title: string; description: string }[] }[]}
 */
export const ADMIN_CAPABILITIES = [
  {
    area: "Indstillinger",
    items: [
      { title: "Beregninger", description: "Justere nøgletal-parametre der styrer Pulse (vægte, tærskler, rentabilitet)." },
      { title: "ClickUp sync", description: "Forhåndsvise og importere kunder, brugere, opgaver, afdelinger og videnbank fra ClickUp." },
      { title: "Indeks fra Apex", description: "Se status og hente Indeks fra Apex manuelt." },
      { title: "Testkunde", description: "Oprette, genskabe og slette testkunden samt styre om testdata vises i applikationen." },
      { title: "Stamdata", description: "Oprette, redigere og slette stamdata (afdelinger, kunder, kontakter, team, skabeloner m.m.) og oprette testdata." },
    ],
  },
  {
    area: "Brugere",
    items: [
      { title: "Se alle brugere", description: "Brugerlisten og de enkelte brugeres kontooplysninger." },
      { title: "Redigere brugere", description: "Ændre navn, e-mail, profilbillede, adgangsniveau og teamprofil (titel, afdeling, timer, aktiv). Adgang sker via Google-login, så der findes ingen adgangskoder at nulstille." },
      { title: "Gøre andre til admin", description: "Give eller fjerne administratorrollen. Man kan ikke fjerne sin egen rolle, og den sidste admin kan ikke fjernes." },
    ],
  },
  {
    area: "Kunder",
    items: [
      { title: "Arkivere og genaktivere kunder", description: "Sætte en kunde på pause, gøre den inaktiv (arkivere), registrere opsigelse og årsag, og genaktivere." },
      { title: "Ændre aftalebeløb", description: "Redigere MRR, servicebudgetter, engangs-web, serviceaftale og årlig regulering." },
      { title: "Kundegrupper", description: "Oprette og omdøbe kundegrupper samt ændre CVR, nøgler og ClickUp-id." },
    ],
  },
  {
    area: "Kontrakter og opsalg",
    items: [
      { title: "Pause, afslut og genaktivér kontrakt", description: "Ændre en kontrakts status." },
      { title: "Kontraktskabeloner", description: "Oprette, redigere og slette skabeloner." },
      { title: "Slette opsalg", description: "Fjerne registrerede opsalg." },
    ],
  },
  {
    area: "Team, NPS og viden",
    items: [
      { title: "Redigere teammedlemmer", description: "Ændre afdeling og profil for teammedlemmer." },
      { title: "NPS-opsætning", description: "Ændre automatisk udsendelse, tidspunkter og NPS-skabeloner." },
      { title: "Slette artikler og opgaveskabeloner", description: "Fjerne artikler i videnbanken og opgaveskabeloner." },
    ],
  },
];

/** Hvad alle brugere (også standard) kan — vises som kontrast. */
export const STANDARD_USER_CAPABILITIES = [
  "Se og arbejde i Pulse, kunder, opgaver, kalender, tid, kontrakter, NPS og videnbank",
  "Oprette og redigere opgaver, tidsregistreringer, noter og kommentarer",
  "Oprette nye kunder og redigere kundeoplysninger (kontakter, ejer, services, tags m.m.)",
  "Registrere opsalg og sende kontrakter til underskrift (inkl. fornyelse)",
  "Skrive og redigere artikler i videnbanken",
];
