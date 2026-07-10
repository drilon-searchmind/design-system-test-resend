/**
 * Client-safe admin CRUD definitions (fields, labels, enums).
 * Server maps `id` → Mongoose model in `lib/server/crm-crud.js`.
 */

import { ADMIN_IS_TEST_FIELD } from "@/lib/crm/admin-test-field";

/** @typedef {'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'select' | 'relation' | 'multiRelation' | 'tags' | 'colorToken'} AdminFieldType */

/**
 * @typedef {object} AdminFieldDef
 * @property {string} name
 * @property {string} label
 * @property {AdminFieldType} type
 * @property {boolean} [required]
 * @property {string} [placeholder]
 * @property {string} [hint]
 * @property {{ value: string; label: string }[]} [options]
 * @property {string} [relation] — resource id for relation / multiRelation
 * @property {string} [relationLabelKey] — field on related doc for &lt;option&gt; label
 */

/**
 * @typedef {object} AdminResourceMeta
 * @property {string} label
 * @property {string} labelSingular
 * @property {string} description
 * @property {AdminFieldDef[]} fields
 * @property {string[]} listColumns
 */

/** @type {Record<string, AdminResourceMeta>} */
export const ADMIN_RESOURCE_META = {
  departments: {
    label: "Afdelinger",
    labelSingular: "afdeling",
    description: "Organisatoriske enheder (SEO, PPC, osv.) — bruges af team og opgaveskabeloner.",
    listColumns: ["key", "name", "shortLabel", "colorToken", "capacityHours"],
    fields: [
      { name: "key", label: "Nøgle", type: "text", required: true, placeholder: "seo" },
      { name: "name", label: "Navn", type: "text", required: true, placeholder: "SEO" },
      { name: "shortLabel", label: "Kort label", type: "text", placeholder: "SEO" },
      { name: "capacityHours", label: "Kapacitet (t/uge)", type: "number" },
      {
        name: "colorToken",
        label: "Farve-token",
        type: "colorToken",
        hint: "Design-system tokens fra listen, eller egen hex / token-navn.",
      },
    ],
  },
  clients: {
    label: "Kunder",
    labelSingular: "kunde",
    description: "Kundekonti — slug bruges i URLs og timer (fx c-nordvig).",
    listColumns: ["slug", "name", "industry", "status", "health"],
    fields: [
      { name: "slug", label: "Slug", type: "text", required: true, placeholder: "c-nordvig" },
      { name: "name", label: "Navn", type: "text", required: true },
      { name: "industry", label: "Branche", type: "text" },
      { name: "logoInitials", label: "Initialer (logo)", type: "text", placeholder: "NV" },
      { name: "hue", label: "Hue (0–360)", type: "number" },
      { name: "currency", label: "Valuta", type: "text", placeholder: "DKK" },
      { name: "retainerAmount", label: "Retainer (beløb)", type: "number" },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "active", label: "Aktiv" },
          { value: "paused", label: "Pauset" },
          { value: "inactive", label: "Inaktiv" },
        ],
      },
      {
        name: "health",
        label: "Sundhed",
        type: "select",
        options: [
          { value: "ok", label: "OK" },
          { value: "warn", label: "Advarsel" },
          { value: "bad", label: "Kritisk" },
        ],
      },
      { name: "ownerMemberKey", label: "Owner (team-nøgle)", type: "text", placeholder: "tm-..." },
      {
        name: "npsInterval",
        label: "NPS-interval",
        type: "select",
        options: [
          { value: "", label: "—" },
          { value: "monthly", label: "Månedlig" },
          { value: "quarterly", label: "Kvartalsvis" },
          { value: "biannual", label: "Halvårlig" },
        ],
      },
    ],
  },
  contacts: {
    label: "Kontakter",
    labelSingular: "kontakt",
    description: "Kontaktpersoner knyttet til en kunde.",
    listColumns: ["name", "email", "title", "clientId"],
    fields: [
      { name: "clientId", label: "Kunde", type: "relation", relation: "clients", relationLabelKey: "name", required: true },
      { name: "name", label: "Navn", type: "text", required: true },
      { name: "title", label: "Titel", type: "text" },
      { name: "email", label: "E-mail", type: "text" },
      { name: "phone", label: "Telefon", type: "text" },
      { name: "isPrimary", label: "Primær kontakt", type: "boolean" },
    ],
  },
  contracts: {
    label: "Kontrakter",
    labelSingular: "kontrakt",
    description: "Aftaler og retainere pr. kunde.",
    listColumns: ["label", "type", "status", "value", "clientId"],
    fields: [
      { name: "clientId", label: "Kunde", type: "relation", relation: "clients", relationLabelKey: "name", required: true },
      { name: "key", label: "Nøgle (valgfri)", type: "text", placeholder: "ctr-c-nordvig" },
      {
        name: "type",
        label: "Type",
        type: "select",
        options: [
          { value: "retainer", label: "Retainer" },
          { value: "project", label: "Projekt" },
          { value: "one_off", label: "Engangs" },
          { value: "subscription", label: "Abonnement" },
        ],
      },
      { name: "label", label: "Betegnelse", type: "text" },
      { name: "value", label: "Værdi", type: "number" },
      { name: "currency", label: "Valuta", type: "text", placeholder: "DKK" },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "draft", label: "Kladde" },
          { value: "active", label: "Aktiv" },
          { value: "notice", label: "Opsigelse" },
          { value: "ended", label: "Afsluttet" },
        ],
      },
      { name: "startDate", label: "Start", type: "date" },
      { name: "endDate", label: "Slut", type: "date" },
      { name: "renewalDate", label: "Fornyelse", type: "date" },
      { name: "termsSummary", label: "Vilkår (kort)", type: "textarea" },
    ],
  },
  "team-members": {
    label: "Team",
    labelSingular: "teammedlem",
    description: "Medarbejdere i bureauet — kan kobles til login senere.",
    listColumns: ["key", "name", "roleTitle", "departmentKey", "active"],
    fields: [
      { name: "key", label: "Nøgle", type: "text", required: true, placeholder: "tm-anna" },
      { name: "name", label: "Navn", type: "text", required: true },
      { name: "roleTitle", label: "Rolle", type: "text" },
      {
        name: "departmentId",
        label: "Afdeling",
        type: "relation",
        relation: "departments",
        relationLabelKey: "name",
      },
      { name: "departmentKey", label: "Afdeling (nøgle)", type: "text", placeholder: "seo" },
      { name: "avatarInitials", label: "Initialer", type: "text", placeholder: "AK" },
      { name: "hue", label: "Hue (0–360)", type: "number" },
      { name: "weeklyHours", label: "Timer/uge", type: "number" },
      { name: "active", label: "Aktiv", type: "boolean" },
    ],
  },
  "task-templates": {
    label: "Opgaveskabeloner",
    labelSingular: "opgaveskabelon",
    description: "Standardiserede skabeloner — opgaver oprettes fra Opgaver-siden.",
    listColumns: ["key", "title", "departmentKey", "defaultPriority", "active"],
    fields: [
      { name: "key", label: "Nøgle", type: "text", required: true, placeholder: "tpl-seo-audit" },
      { name: "title", label: "Titel", type: "text", required: true },
      { name: "description", label: "Beskrivelse", type: "textarea" },
      {
        name: "departmentId",
        label: "Afdeling",
        type: "relation",
        relation: "departments",
        relationLabelKey: "name",
      },
      { name: "departmentKey", label: "Afdeling (nøgle)", type: "text" },
      {
        name: "defaultPriority",
        label: "Prioritet",
        type: "select",
        options: [
          { value: "high", label: "Høj" },
          { value: "medium", label: "Medium" },
          { value: "low", label: "Lav" },
        ],
      },
      { name: "suggestedHours", label: "Foreslåede timer", type: "number" },
      { name: "active", label: "Aktiv", type: "boolean" },
    ],
  },
  "knowledge-articles": {
    label: "Knowledge base",
    labelSingular: "artikel",
    description: "Interne wiki-artikler.",
    listColumns: ["slug", "title", "sectionId", "published", "featured"],
    fields: [
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "title", label: "Titel", type: "text", required: true },
      { name: "sectionId", label: "Sektion", type: "text" },
      { name: "parentSlug", label: "Overordnet slug", type: "text" },
      { name: "icon", label: "Ikon", type: "text" },
      { name: "sortOrder", label: "Sortering", type: "number" },
      { name: "summary", label: "Resumé", type: "textarea" },
      { name: "bodyMd", label: "Indhold (Markdown)", type: "textarea" },
      { name: "tags", label: "Tags (kommasepareret)", type: "tags" },
      {
        name: "audience",
        label: "Målgruppe",
        type: "select",
        options: [
          { value: "internal", label: "Internt" },
          { value: "client", label: "Kunde" },
          { value: "public", label: "Offentlig" },
        ],
      },
      { name: "authorMemberKey", label: "Forfatter (team-nøgle)", type: "text" },
      { name: "readingMinutes", label: "Læsetid (min)", type: "number" },
      { name: "featured", label: "Fremhævet", type: "boolean" },
      { name: "published", label: "Publiceret", type: "boolean" },
    ],
  },
  "nps-templates": {
    label: "NPS-skabeloner",
    labelSingular: "NPS-skabelon",
    description: "E-mail / besked-skabeloner til NPS-udsendelser.",
    listColumns: ["key", "name", "locale", "active"],
    fields: [
      { name: "key", label: "Nøgle", type: "text", required: true },
      { name: "name", label: "Navn", type: "text", required: true },
      { name: "subject", label: "Emne", type: "text", required: true },
      { name: "bodyMd", label: "Brødtekst (Markdown)", type: "textarea", required: true },
      { name: "locale", label: "Sprog", type: "text", placeholder: "da" },
      { name: "active", label: "Aktiv", type: "boolean" },
    ],
  },
  "nps-campaigns": {
    label: "NPS-kampagner",
    labelSingular: "NPS-kampagne",
    description: "Planlagte eller igangværende NPS-bølger.",
    listColumns: ["name", "status", "scheduledAt", "templateId"],
    fields: [
      { name: "name", label: "Navn", type: "text", required: true },
      {
        name: "templateId",
        label: "Skabelon",
        type: "relation",
        relation: "nps-templates",
        relationLabelKey: "name",
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "draft", label: "Kladde" },
          { value: "scheduled", label: "Planlagt" },
          { value: "sending", label: "Sender" },
          { value: "completed", label: "Afsluttet" },
          { value: "cancelled", label: "Annulleret" },
        ],
      },
      { name: "scheduledAt", label: "Planlagt tidspunkt", type: "date" },
      {
        name: "clientIds",
        label: "Kunder (tom = alle)",
        type: "multiRelation",
        relation: "clients",
        relationLabelKey: "name",
        hint: "Vælg én eller flere — lad stå tom for hele bureauet.",
      },
    ],
  },
};

/** @type {string[]} */
export const ADMIN_RESOURCE_IDS = Object.keys(ADMIN_RESOURCE_META);

/** @type {{ id: string; label: string }[]} */
export const ADMIN_RESOURCE_TABS = ADMIN_RESOURCE_IDS.map((id) => ({
  id,
  label: ADMIN_RESOURCE_META[id].label,
}));

for (const id of ADMIN_RESOURCE_IDS) {
  const meta = ADMIN_RESOURCE_META[id];
  if (!meta.fields.some((f) => f.name === "isTest")) {
    meta.fields.push(ADMIN_IS_TEST_FIELD);
  }
  if (!meta.listColumns.includes("isTest")) {
    meta.listColumns.push("isTest");
  }
}
