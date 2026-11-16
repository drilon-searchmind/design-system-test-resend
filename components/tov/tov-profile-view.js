"use client";

import { TovCard } from "@/components/tov/tov-ui";
import { cn } from "@/lib/utils";

const DIMENSIONS = [
  ["formalCasual", "Formel", "Afslappet"],
  ["seriousPlayful", "Seriøs", "Legende"],
  ["reservedBold", "Afdæmpet", "Modig"],
  ["factualEmotional", "Faktuel", "Følelsesladet"],
  ["simpleTechnical", "Enkel", "Teknisk"],
  ["distantWarm", "Distanceret", "Varm"],
  ["traditionalInnovative", "Traditionel", "Nytænkende"],
];

const WORD_LABELS = {
  pointOfView: ["Perspektiv", { we: "Vi", I: "Jeg", third_person: "3. person", you_focused: "Læser-fokus", mixed: "Blandet" }],
  addressForm: ["Tiltale", { du: "du", De: "De", you: "you", formal_you: "formel you", none: "Ingen" }],
  sentenceLength: ["Sætningslængde", { short: "Korte", medium: "Mellem", long: "Lange", varied: "Varieret" }],
  readingLevel: ["Læseniveau", { very_easy: "Meget let", easy: "Let", standard: "Standard", advanced: "Avanceret" }],
  humor: ["Humor", { none: "Ingen", subtle: "Diskret", regular: "Jævnligt", frequent: "Ofte" }],
  emojiUsage: ["Emojis", { never: "Aldrig", rare: "Sjældent", moderate: "Moderat", frequent: "Ofte" }],
  exclamationUsage: ["Udråbstegn", { never: "Aldrig", rare: "Sjældent", moderate: "Moderat", frequent: "Ofte" }],
  jargonLevel: ["Fagsprog", { none: "Ingen", low: "Lavt", medium: "Middel", high: "Højt" }],
};

const TEXT_STYLE_ROWS = [
  ["h1", "Overskrift 1"],
  ["h2", "Overskrift 2"],
  ["h3", "Overskrift 3"],
  ["body", "Brødtekst"],
  ["button", "Knap"],
  ["caption", "Billedtekst"],
];

const CHANNEL_LABELS = {
  website: "Website",
  email: "E-mail",
  social: "Sociale medier",
  ads: "Annoncer",
  newsletter: "Nyhedsbrev",
  support: "Kundeservice",
  pr: "PR",
};

/** @param {{ items: string[]; tone?: "ok" | "bad" | "neutral" }} props */
function Chips({ items, tone = "neutral" }) {
  if (!items?.length) return <p className="font-sans text-[12px] text-fg-quiet">—</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((w, i) => (
        <span
          key={`${w}-${i}`}
          className={cn(
            "rounded-full border px-2.5 py-0.5 font-sans text-[12px]",
            tone === "ok" && "border-agency-ok-border bg-agency-ok-soft text-agency-ok",
            tone === "bad" && "border-agency-bad-border bg-agency-bad-soft text-agency-bad",
            tone === "neutral" && "border-border bg-surface-muted text-fg-muted",
          )}
        >
          {w}
        </span>
      ))}
    </div>
  );
}

/** @param {{ label: string; children: import('react').ReactNode }} props */
function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">{label}</p>
      <div className="mt-1 font-sans text-[13px] leading-relaxed text-fg">{children || <span className="text-fg-quiet">—</span>}</div>
    </div>
  );
}

/** @param {{ items: string[] }} props */
function Bullets({ items }) {
  if (!items?.length) return <span className="text-fg-quiet">—</span>;
  return (
    <ul className="list-disc space-y-1 pl-4 marker:text-fg-quiet">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

/** @param {{ profile: Record<string, any> }} props */
export function TovProfileView({ profile: p }) {
  const known = (v) => (v && v !== "unknown" ? v : "");
  return (
    <div className="flex flex-col gap-[length:var(--ds-studio-stack)]">
      <TovCard title="Sammenfatning">
        <p className="font-sans text-[15px] leading-relaxed text-fg">{p.voice.summary || "—"}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Brand">{p.brand.name}</Field>
          <Field label="Branche">{p.brand.industry}</Field>
          <Field label="Primært sprog">{p.voice.primaryLanguage}</Field>
          <Field label="Tagline">{p.brand.tagline}</Field>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Mission">{p.brand.mission}</Field>
          <Field label="Positionering">{p.brand.positioning}</Field>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Kerneværdier">
            <Chips items={p.brand.coreValues} />
          </Field>
          <Field label="Målgrupper">
            {p.brand.audiences.length ?
              <ul className="space-y-1">
                {p.brand.audiences.map((a, i) => (
                  <li key={i}>
                    <span className="font-medium">{a.name}</span>
                    {a.description ? <span className="text-fg-muted"> — {a.description}</span> : null}
                  </li>
                ))}
              </ul>
            : null}
          </Field>
        </div>
      </TovCard>

      <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-2 lg:items-start">
        <TovCard title="Tone-skalaer">
          <div className="space-y-3.5">
            {DIMENSIONS.map(([key, left, right]) => {
              const v = p.voice.dimensions[key] ?? 0;
              return (
                <div key={key}>
                  <div className="flex justify-between font-sans text-[11px] text-fg-muted">
                    <span>{left}</span>
                    <span className="tabular-nums text-fg-quiet">{v}</span>
                    <span>{right}</span>
                  </div>
                  <div className="relative mt-1 h-1.5 rounded-full bg-surface-muted">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                    <div
                      className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas bg-agency-brand shadow"
                      style={{ left: `${v}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </TovCard>

        <TovCard title="Personlighed">
          <div className="space-y-3">
            {p.voice.personality.map((t, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-sans text-[13px] font-semibold text-fg">{t.trait}</span>
                  <span className="font-sans text-[11px] tabular-nums text-fg-quiet">{t.intensity}</span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-agency-brand/70" style={{ width: `${t.intensity}%` }} />
                </div>
                <p className="mt-1 font-sans text-[12px] leading-snug text-fg-muted">{t.description}</p>
              </div>
            ))}
            {!p.voice.personality.length ? <p className="text-fg-quiet">—</p> : null}
          </div>
        </TovCard>
      </div>

      <TovCard title="Sprog & stil">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(WORD_LABELS).map(([key, [label, map]]) => (
            <Field key={key} label={label}>
              {map[p.voice[key]] ?? p.voice[key]}
            </Field>
          ))}
          <Field label="Ord pr. sætning">{p.voice.averageSentenceWords ? `~${p.voice.averageSentenceWords}` : ""}</Field>
          <Field label="Overskrifter">
            {{ sentence_case: "Første ord med stort", title_case: "Alle ord med stort", mixed: "Blandet" }[p.style.capitalization]}
          </Field>
          <Field label="Tal">{p.style.numberFormat}</Field>
          <Field label="Dato / valuta">{[p.style.dateFormat, p.style.currencyFormat].filter(Boolean).join(" · ")}</Field>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Punktum og tegnsætning">{p.style.punctuationNotes}</Field>
          <Field label="Formatering">
            <Bullets items={p.style.formattingRules} />
          </Field>
          <Field label="Gør">
            <Bullets items={p.style.dos} />
          </Field>
          <Field label="Gør ikke">
            <Bullets items={p.style.donts} />
          </Field>
        </div>
      </TovCard>

      <TovCard title="Ordforråd">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Foretrukne ord">
            <Chips items={p.vocabulary.preferredWords} tone="ok" />
          </Field>
          <Field label="Undgåede ord">
            <Chips items={p.vocabulary.avoidedWords} tone="bad" />
          </Field>
          <Field label="Signatur-vendinger">
            <Chips items={p.vocabulary.signaturePhrases} />
          </Field>
          <Field label="Forbudte vendinger">
            <Chips items={p.vocabulary.bannedPhrases} tone="bad" />
          </Field>
        </div>
        {p.vocabulary.terminology.length ?
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left font-sans text-[12px]">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wide text-fg-soft">
                  <th className="py-2 pr-3 font-medium">Term</th>
                  <th className="py-2 pr-3 font-medium">Brug</th>
                  <th className="py-2 font-medium">I stedet for</th>
                </tr>
              </thead>
              <tbody>
                {p.vocabulary.terminology.map((t, i) => (
                  <tr key={i} className="border-b border-border-soft last:border-0">
                    <td className="py-2 pr-3 font-medium text-fg">{t.term}</td>
                    <td className="py-2 pr-3 text-fg-muted">{t.use}</td>
                    <td className="py-2 text-fg-muted">{t.insteadOf || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        : null}
      </TovCard>

      <div className="grid gap-[length:var(--ds-studio-stack)] lg:grid-cols-2 lg:items-start">
        <TovCard title="Typografi">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Primær skrifttype">
              <span className="font-semibold">{known(p.typography.primaryFont.family) || "Ukendt"}</span>
              <span className="block text-[12px] text-fg-muted">
                {[p.typography.primaryFont.fallbacks, p.typography.primaryFont.source].filter(Boolean).join(" · ")}
              </span>
            </Field>
            <Field label="Sekundær skrifttype">
              <span className="font-semibold">{known(p.typography.secondaryFont.family) || "Ukendt"}</span>
              <span className="block text-[12px] text-fg-muted">
                {[p.typography.secondaryFont.fallbacks, p.typography.secondaryFont.source].filter(Boolean).join(" · ")}
              </span>
            </Field>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[380px] border-collapse text-left font-sans text-[12px]">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wide text-fg-soft">
                  <th className="py-2 pr-3 font-medium">Element</th>
                  <th className="py-2 pr-3 font-medium">Størrelse</th>
                  <th className="py-2 pr-3 font-medium">Vægt</th>
                  <th className="py-2 pr-3 font-medium">Linjehøjde</th>
                  <th className="py-2 font-medium">Spacing</th>
                </tr>
              </thead>
              <tbody>
                {TEXT_STYLE_ROWS.map(([key, label]) => {
                  const s = p.typography[key];
                  return (
                    <tr key={key} className="border-b border-border-soft tabular-nums last:border-0">
                      <td className="py-2 pr-3 text-fg">{label}</td>
                      <td className="py-2 pr-3 text-fg-muted">{s.size || "—"}</td>
                      <td className="py-2 pr-3 text-fg-muted">{s.weight || "—"}</td>
                      <td className="py-2 pr-3 text-fg-muted">{s.lineHeight || "—"}</td>
                      <td className="py-2 text-fg-muted">
                        {[s.letterSpacing, s.textTransform !== "none" ? s.textTransform : ""].filter(Boolean).join(" · ") || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TovCard>

        <TovCard title="Farver & visuelt">
          <div className="flex flex-wrap gap-2">
            {(p.colors.palette.length ?
              p.colors.palette
            : [p.colors.primary, p.colors.secondary, p.colors.accent, p.colors.background, p.colors.text]
                .filter(Boolean)
                .map((hex) => ({ name: "", hex, role: "" }))
            ).map((c, i) => (
              <div key={i} className="w-[104px]">
                <div className="h-12 rounded-md border border-border" style={{ background: c.hex || "transparent" }} />
                <p className="mt-1 truncate font-sans text-[11px] font-medium text-fg">{c.name || c.role || "Farve"}</p>
                <p className="font-sans text-[10px] tabular-nums text-fg-quiet">{c.hex}</p>
                {c.role && c.name ? <p className="truncate font-sans text-[10px] text-fg-quiet">{c.role}</p> : null}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Primær / Accent">{[p.colors.primary, p.colors.accent].filter(Boolean).join(" · ")}</Field>
            <Field label="Baggrund / Tekst">{[p.colors.background, p.colors.text].filter(Boolean).join(" · ")}</Field>
            <Field label="Billedstil">{p.visual.imageryStyle}</Field>
            <Field label="Ikonstil">{p.visual.iconStyle}</Field>
            <Field label="Knapper">{p.visual.buttonStyle}</Field>
            <Field label="Hjørneradius">{p.visual.cornerRadius}</Field>
          </div>
          {p.visual.layoutNotes ?
            <div className="mt-3">
              <Field label="Layout">{p.visual.layoutNotes}</Field>
            </div>
          : null}
        </TovCard>
      </div>

      <TovCard title="Kommunikation">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Elevator pitch">{p.messaging.elevatorPitch}</Field>
          <Field label="Boilerplate">{p.messaging.boilerplate}</Field>
        </div>
        {p.messaging.pillars.length ?
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {p.messaging.pillars.map((m, i) => (
              <div key={i} className="rounded-lg border border-border-soft bg-surface-muted/40 p-3">
                <p className="font-sans text-[13px] font-semibold text-fg">{m.title}</p>
                <p className="mt-1 font-sans text-[12px] leading-snug text-fg-muted">{m.description}</p>
                {m.proof ? <p className="mt-1.5 font-sans text-[11px] text-fg-quiet">Bevis: {m.proof}</p> : null}
              </div>
            ))}
          </div>
        : null}
        {p.channels.length ?
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {p.channels.map((c, i) => (
              <div key={i} className="rounded-lg border border-border-soft p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-agency-brand">
                  {CHANNEL_LABELS[c.channel] ?? c.channel}
                </p>
                <p className="mt-1 font-sans text-[12px] leading-snug text-fg-muted">{c.toneShift}</p>
                {c.example ? <p className="mt-1.5 font-sans text-[13px] italic text-fg">“{c.example}”</p> : null}
              </div>
            ))}
          </div>
        : null}
      </TovCard>

      <TovCard title="Eksempler">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Overskrifter">
            <Bullets items={p.examples.headlines} />
          </Field>
          <Field label="CTA'er">
            <Bullets items={p.examples.ctas} />
          </Field>
          <Field label="E-mail emnelinjer">
            <Bullets items={p.examples.emailSubjectLines} />
          </Field>
          <Field label="Sociale opslag">
            <Bullets items={p.examples.socialPosts} />
          </Field>
          <Field label="Annoncetekster">
            <Bullets items={p.examples.adCopy} />
          </Field>
          <Field label="Brødtekst-eksempel">{p.examples.bodyParagraph}</Field>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-agency-ok">På brand</p>
            {p.examples.good.map((e, i) => (
              <div key={i} className="rounded-lg border border-agency-ok-border bg-agency-ok-soft/40 p-3">
                <p className="font-sans text-[13px] text-fg">“{e.text}”</p>
                <p className="mt-1 font-sans text-[11px] text-fg-muted">{e.why}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-agency-bad">Ikke på brand</p>
            {p.examples.bad.map((e, i) => (
              <div key={i} className="rounded-lg border border-agency-bad-border bg-agency-bad-soft/40 p-3">
                <p className="font-sans text-[13px] text-fg">“{e.text}”</p>
                <p className="mt-1 font-sans text-[11px] text-fg-muted">{e.why}</p>
              </div>
            ))}
          </div>
        </div>
      </TovCard>

      <TovCard title="Datagrundlag">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-[22px] items-center rounded-full border border-agency-brand-border bg-agency-brand-soft px-2 font-sans text-[11px] font-medium tabular-nums text-agency-brand">
            Sikkerhed {p.confidence.overall}/100
          </span>
          <p className="font-sans text-[12px] text-fg-muted">{p.confidence.notes}</p>
        </div>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <Field label="Mangler for bedre profil">
            <Bullets items={p.confidence.missingInfo} />
          </Field>
          <Field label="Tungeste kilder">
            <Bullets items={p.confidence.sourcesUsed} />
          </Field>
        </div>
      </TovCard>
    </div>
  );
}
