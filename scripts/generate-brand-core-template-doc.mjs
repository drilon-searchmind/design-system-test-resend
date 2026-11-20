/**
 * Genererer docs/BRAND-CORE-TEMPLATE.md ud fra lib/tov/template.js.
 * Kør: node scripts/generate-brand-core-template-doc.mjs
 */
import { writeFileSync } from "node:fs";

import { TOV_TEMPLATE_SECTIONS } from "../lib/tov/template.js";

const lines = [
  "# Brand Core: skabelon for analysen",
  "",
  "> Genereret fra `lib/tov/template.js`. Ret reglerne dér og kør `node scripts/generate-brand-core-template-doc.mjs`.",
  "",
  "Hver analyse leverer de samme sektioner. **Formen** (felter, valgmuligheder, antal) ligger i `lib/tov/schema.js` (`TOV_PROFILE_SCHEMA`) og håndhæves på modellens svar. **Indholdsstandarden** herunder sendes med i analyse-prompten (`ANALYZE_SYSTEM` i `lib/tov/prompts.js`). Tallene er mål, ikke krav om fyld.",
  "",
  "Standarden er udledt af en analyse, teamet har vurderet som målniveauet.",
  "",
];
TOV_TEMPLATE_SECTIONS.forEach((s, i) => {
  lines.push(`## ${i + 1}. ${s.title}`, "", `Felter: \`${s.fields}\``, "", ...s.rules.map((r) => `- ${r}`), "");
});
lines.push(
  "## Ændre skabelonen",
  "",
  "- **Nyt eller omdøbt felt:** ret `lib/tov/schema.js`, hæv `TOV_SCHEMA_VERSION`, og vis det i `components/tov/tov-profile-view.js`.",
  "- **Kvalitetskrav:** ret `lib/tov/template.js` og regenerér dokumentet.",
  "- Eksisterende profiler følger den nye standard, første gang kunden analyseres igen.",
  "",
);
writeFileSync(new URL("../docs/BRAND-CORE-TEMPLATE.md", import.meta.url), lines.join("\n"));
