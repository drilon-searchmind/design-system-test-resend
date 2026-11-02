/** @typedef {{ token: string; label: string; description: string; fields?: ('subject' | 'emailBodyMd' | 'documentBodyMd')[] }} ContractTemplateVariable */

/** @type {ContractTemplateVariable[]} */
export const CONTRACT_TEMPLATE_VARIABLES = [
  {
    token: "{{clientName}}",
    label: "Kundenavn",
    description: "Firma- eller kontonavn",
  },
  {
    token: "{{clientCvr}}",
    label: "CVR",
    description: "Kundens CVR-nummer (tomt hvis ikke angivet)",
  },
  {
    token: "{{monthlyValue}}",
    label: "Månedligt vederlag (MRR)",
    description: "Fx 25.000 DKK — fra kontrakten",
  },
  {
    token: "{{services}}",
    label: "Service lines",
    description: "Kommasepareret liste, fx SEO, PPC — fra kontrakten",
  },
  {
    token: "{{startDate}}",
    label: "Startdato",
    description: "Aftalens startdato (dansk format)",
  },
  {
    token: "{{renewalDate}}",
    label: "Fornyelsesdato",
    description: "Aftalens fornyelsesdato (tom hvis ikke angivet)",
  },
  {
    token: "{{signerName}}",
    label: "Underskriver",
    description: "Navn på person der skal underskrive",
  },
  {
    token: "{{contractLabel}}",
    label: "Aftaletitel",
    description: "Fx Retainer 2026 — fra kontrakten",
  },
  {
    token: "{{noticeDays}}",
    label: "Opsigelsesvarsel",
    description: "Antal kalenderdage (tal)",
  },
  {
    token: "{{today}}",
    label: "Dagens dato",
    description: "ISO-dato ved udsendelse",
  },
  {
    token: "{{signingUrl}}",
    label: "Underskriftslink",
    description: "Unikt link — kun i e-mail (genereres ved send)",
    fields: ["emailBodyMd"],
  },
  {
    token: "{{accessCode}}",
    label: "Adgangskode",
    description: "6-cifret kode til underskriftssiden — kun i e-mail",
    fields: ["emailBodyMd"],
  },
];
