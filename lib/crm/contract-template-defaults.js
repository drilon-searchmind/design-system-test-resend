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

export const CONTRACT_TYPE_OPTIONS = [
  { value: "retainer", label: "Retainer" },
  { value: "project", label: "Projekt" },
  { value: "one_off", label: "Engangs" },
  { value: "subscription", label: "Abonnement" },
];

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
