/** @typedef {{ token: string; label: string; description: string }} NpsTemplateVariable */

/** @type {NpsTemplateVariable[]} */
export const NPS_TEMPLATE_VARIABLES = [
  {
    token: "{{firstName}}",
    label: "Fornavn",
    description: "Kontaktens fornavn (primær kontakt)",
  },
  {
    token: "{{accountManager}}",
    label: "Kontoansvarlig",
    description: "Navn på kontoansvarlig / ejer",
  },
  {
    token: "{{clientName}}",
    label: "Kundenavn",
    description: "Firma- eller kontonavn",
  },
  {
    token: "{{surveyUrl}}",
    label: "Undersøgelseslink",
    description: "Unikt svar-link — genereres ved udsendelse",
  },
];
