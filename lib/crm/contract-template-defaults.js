/** Shared default copy for new contract templates (UI create + DB seed). */

export const DEFAULT_CONTRACT_TEMPLATE_SUBJECT =
  "Underskriv aftale med Searchmind — {{clientName}}";

export const DEFAULT_CONTRACT_TEMPLATE_EMAIL = `Hej {{signerName}},

Vi har klarlagt en aftale mellem Searchmind og {{clientName}}.

Åbn linket for at læse og underskrive aftalen:
{{signingUrl}}

Din adgangskode: {{accessCode}}

Linket udløber om 30 dage. Kontakt os, hvis du har spørgsmål.

Venlig hilsen
Searchmind`;

export const DEFAULT_CONTRACT_TEMPLATE_DOCUMENT = `# Samarbejdsaftale — Searchmind

**Kunde:** {{clientName}}  
**Aftaletype:** Retainer  
**Dato:** {{today}}

## 1. Parterne
Denne aftale indgås mellem Searchmind ApS ("Leverandøren") og {{clientName}} ("Kunden").

## 2. Ydelser
Leverandøren leverer marketing- og rådgivningsydelser som aftalt i bilag eller løbende briefings.

## 3. Vederlag
Månedligt vederlag og eventuelle projektpriser aftales særskilt og fremgår af den kommercielle oversigt i Searchmind Agency OS.

## 4. Opsigelse
Aftalen kan opsiges med {{noticeDays}} dages varsel til udgangen af en kalendermåned, medmindre andet er aftalt skriftligt.

## 5. Fortrolighed
Parterne behandler fortrolige oplysninger fortroligt og i overensstemmelse med gældende lovgivning, herunder GDPR.

## 6. Underskrift
Ved elektronisk underskrift bekræfter underskriveren at være bemyndiget til at indgå aftalen på vegne af Kunden.
`;

/** UI-visible contract types for template defaults (extend when more types are supported). */
export const CONTRACT_TYPE_OPTIONS = [{ value: "retainer", label: "Retainer" }];

/**
 * @returns {{
 *   subject: string;
 *   emailBodyMd: string;
 *   documentBodyMd: string;
 *   defaultType: string;
 *   defaultNoticeDays: number;
 * }}
 */
export function emptyContractTemplateDraft() {
  return {
    subject: DEFAULT_CONTRACT_TEMPLATE_SUBJECT,
    emailBodyMd: DEFAULT_CONTRACT_TEMPLATE_EMAIL,
    documentBodyMd: DEFAULT_CONTRACT_TEMPLATE_DOCUMENT,
    defaultType: "retainer",
    defaultNoticeDays: 90,
  };
}

const COMMON_EMAIL = DEFAULT_CONTRACT_TEMPLATE_EMAIL;

/** Starter-skabeloner (seedes én gang via `npm run seed-contract-templates`). */
export const STARTER_CONTRACT_TEMPLATES = [
  {
    key: "ny-kunde-retainer",
    name: "Ny kunde — retainer",
    subject: "Velkommen til Searchmind — underskriv aftale for {{clientName}}",
    emailBodyMd: `Hej {{signerName}},

Tak for tilliden — vi glæder os til at starte samarbejdet med {{clientName}}.

Her er jeres aftale, som kan læses og underskrives elektronisk:
{{signingUrl}}

Adgangskode: {{accessCode}}

Aftalen omfatter: {{services}}
{{valueLabel}}: {{monthlyValue}}

Når aftalen er underskrevet, opretter vi jer som kunde og kontakter jer om opstart.

Venlig hilsen
Searchmind`,
    documentBodyMd: `# Samarbejdsaftale — Searchmind

**Kunde:** {{clientName}}  
**CVR:** {{clientCvr}}  
**Dato:** {{today}}

## 1. Parterne
Aftalen indgås mellem Searchmind ApS ("Leverandøren") og {{clientName}} ("Kunden").

## 2. Ydelser
Leverandøren leverer følgende ydelser:

{{servicesList}}

## 3. Vederlag
{{valueLabel}}: **{{monthlyValue}}** ekskl. moms, faktureret månedligt forud fra {{startDate}}.

## 4. Opsigelse
Aftalen er løbende og kan opsiges med {{noticeDays}} dages varsel til udgangen af en kalendermåned.

## 5. Fortrolighed og databehandling
Parterne behandler fortrolige oplysninger fortroligt og i overensstemmelse med gældende lovgivning, herunder GDPR.

## 6. Underskrift
Ved elektronisk underskrift bekræfter underskriveren at være bemyndiget til at indgå aftalen på vegne af Kunden.
`,
    defaultType: "retainer",
    defaultNoticeDays: 90,
  },
  {
    key: "eksisterende-kunde-ny-aftale",
    name: "Eksisterende kunde — ny aftale / opsalg",
    subject: "Ny aftale med Searchmind — {{clientName}}",
    emailBodyMd: `Hej {{signerName}},

Tak for den fortsatte tillid. Vi har lavet en ny aftale til {{clientName}}, som erstatter og udvider jeres nuværende samarbejde.

Læs og underskriv her:
{{signingUrl}}

Adgangskode: {{accessCode}}

Nye ydelser: {{services}}
{{valueLabel}}: {{monthlyValue}}

Venlig hilsen
Searchmind`,
    documentBodyMd: `# Ny aftale (opsalg) — Searchmind

**Kunde:** {{clientName}}  
**Dato:** {{today}}

## 1. Baggrund
Denne aftale er en ny aftale mellem Searchmind ApS og {{clientName}}. Den lægges oveni kundens eksisterende aftaler og danner den nye samlede ramme.

## 2. Ydelser
{{servicesList}}

## 3. Vederlag
{{valueLabel}}: **{{monthlyValue}}** ekskl. moms fra {{startDate}}.

## 4. Opsigelse
{{noticeDays}} dages varsel til udgangen af en kalendermåned.

## 5. Underskrift
Ved elektronisk underskrift bekræfter underskriveren at være bemyndiget til at indgå aftalen på vegne af Kunden.
`,
    defaultType: "retainer",
    defaultNoticeDays: 90,
  },
  {
    key: "engangssalg-web",
    name: "Engangssalg — web og services",
    subject: "Tilbud fra Searchmind — {{clientName}}",
    emailBodyMd: `Hej {{signerName}},

Her er aftalen for jeres engangsopgave med Searchmind.

Læs og underskriv her:
{{signingUrl}}

Adgangskode: {{accessCode}}

Omfang: {{services}}
{{valueLabel}}: {{monthlyValue}}

Venlig hilsen
Searchmind`,
    documentBodyMd: `# Aftale om engangsopgave — Searchmind

**Kunde:** {{clientName}}  
**CVR:** {{clientCvr}}  
**Dato:** {{today}}

## 1. Omfang
Searchmind ApS leverer følgende til {{clientName}}:

{{servicesList}}

## 2. Pris og betaling
{{valueLabel}}: **{{monthlyValue}}** ekskl. moms. Faktureres ved opstart/levering efter aftale.

## 3. Ændringer
Ændringer i omfang aftales skriftligt og kan påvirke pris og tidsplan.

## 4. Underskrift
Ved elektronisk underskrift bekræfter underskriveren at være bemyndiget til at indgå aftalen på vegne af Kunden.
`,
    defaultType: "one_off",
    defaultNoticeDays: 30,
  },
  {
    key: "serviceaftale-aarlig",
    name: "Serviceaftale (årlig)",
    subject: "Serviceaftale med Searchmind — {{clientName}}",
    emailBodyMd: COMMON_EMAIL,
    documentBodyMd: `# Serviceaftale — Searchmind

**Kunde:** {{clientName}}  
**Dato:** {{today}}

## 1. Ydelser
{{servicesList}}

## 2. Vederlag
{{valueLabel}}: **{{monthlyValue}}** ekskl. moms, faktureret årligt forud fra {{startDate}}.

## 3. Varighed
Serviceaftalen løber i 12 måneder og fornyes automatisk, medmindre den opsiges med {{noticeDays}} dages varsel.

## 4. Underskrift
Ved elektronisk underskrift bekræfter underskriveren at være bemyndiget til at indgå aftalen på vegne af Kunden.
`,
    defaultType: "subscription",
    defaultNoticeDays: 60,
  },
];