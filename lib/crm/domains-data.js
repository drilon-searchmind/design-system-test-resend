/** Client domains & locales — ClickUp migration mapping. */

/**
 * @typedef {object} ClientDomain
 * @property {string} id
 * @property {string} clientId
 * @property {string} domain
 * @property {string} locale
 * @property {boolean} isPrimary
 * @property {string | null} cms
 */

/** @type {ClientDomain[]} */
export const DOMAINS = [
  // Nordvig — single market
  {
    id: "dom-nv-1",
    clientId: "c-nordvig",
    domain: "nordvig.dk",
    locale: "da-DK",
    isPrimary: true,
    cms: "WordPress",
  },
  // Torvehallerne — multi-market
  {
    id: "dom-torv-1",
    clientId: "c-torv",
    domain: "torvehallerne.dk",
    locale: "da-DK",
    isPrimary: true,
    cms: "Umbraco",
  },
  {
    id: "dom-torv-2",
    clientId: "c-torv",
    domain: "torvehallerne.com",
    locale: "en-GB",
    isPrimary: false,
    cms: "Umbraco",
  },
  {
    id: "dom-torv-3",
    clientId: "c-torv",
    domain: "torvehallerne.se",
    locale: "sv-SE",
    isPrimary: false,
    cms: "Umbraco",
  },
  // Norden Finans — multi-market
  {
    id: "dom-nf-1",
    clientId: "c-norden",
    domain: "nordenfinans.dk",
    locale: "da-DK",
    isPrimary: true,
    cms: "WordPress",
  },
  {
    id: "dom-nf-2",
    clientId: "c-norden",
    domain: "nordenfinans.se",
    locale: "sv-SE",
    isPrimary: false,
    cms: "WordPress",
  },
  {
    id: "dom-nf-3",
    clientId: "c-norden",
    domain: "nordenfinans.no",
    locale: "nb-NO",
    isPrimary: false,
    cms: "WordPress",
  },
  // Hof Meubelen — multi-market
  {
    id: "dom-hof-1",
    clientId: "c-hof",
    domain: "hofmeubelen.dk",
    locale: "da-DK",
    isPrimary: true,
    cms: "Shopify",
  },
  {
    id: "dom-hof-2",
    clientId: "c-hof",
    domain: "hofmeubelen.de",
    locale: "de-DE",
    isPrimary: false,
    cms: "Shopify",
  },
  {
    id: "dom-hof-3",
    clientId: "c-hof",
    domain: "hofmeubelen.nl",
    locale: "nl-NL",
    isPrimary: false,
    cms: "Shopify",
  },
];

/**
 * @param {string} clientId
 * @returns {ClientDomain[]}
 */
export function domainsForClient(clientId) {
  return DOMAINS.filter((d) => d.clientId === clientId);
}
