"use client";

import { useMemo, useState } from "react";

import { PulseIconChevronDown } from "@/components/pulse/pulse-icons";
import {
  CUSTOM_COLOR_TOKEN_VALUE,
  PRESET_COLOR_TOKENS,
  isPresetColorToken,
  resolveColorTokenCss,
} from "@/lib/crm/color-tokens";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   id: string;
 *   label: string;
 *   value: unknown;
 *   onChange: (value: string) => void;
 *   hint?: string;
 * }} props
 */
export function ColorTokenField({ id, label, value, onChange, hint }) {
  const stored = String(value ?? "").trim();
  const [mode, setMode] = useState(() =>
    stored && !isPresetColorToken(stored) ? CUSTOM_COLOR_TOKEN_VALUE : stored || "",
  );
  const [customToken, setCustomToken] = useState(() =>
    stored && !isPresetColorToken(stored) && !stored.startsWith("#") ? stored : "",
  );
  const [customHex, setCustomHex] = useState(() =>
    stored && !isPresetColorToken(stored) && stored.startsWith("#") ? stored : "#3b9eff",
  );

  const displayColor = useMemo(() => {
    if (mode === CUSTOM_COLOR_TOKEN_VALUE) {
      return customToken.startsWith("#")
        ? customToken
        : (resolveColorTokenCss(customToken) ?? customHex);
    }
    return resolveColorTokenCss(mode);
  }, [mode, customToken, customHex]);

  function handlePresetChange(next) {
    setMode(next);
    if (next === CUSTOM_COLOR_TOKEN_VALUE) {
      const v = customToken.trim() || customHex;
      onChange(v);
    } else {
      onChange(next);
    }
  }

  function handleCustomTokenChange(next) {
    setCustomToken(next);
    onChange(next.trim());
  }

  function handleCustomHexChange(hex) {
    setCustomHex(hex);
    setCustomToken(hex);
    onChange(hex);
  }

  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">{label}</span>

      <div className="flex flex-wrap items-stretch gap-3">
        <span
          className="mt-1 size-10 shrink-0 rounded-xl border border-border"
          style={{ background: displayColor ?? "var(--ds-surface-muted)" }}
          title={displayColor ?? undefined}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="relative">
            <select
              id={id}
              value={mode}
              onChange={(e) => handlePresetChange(e.target.value)}
              className={cn(
                "h-10 w-full appearance-none rounded-lg border border-border bg-surface-muted py-2 pl-3 pr-9",
                "font-sans text-[13px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
              )}
            >
              <option value="">— Ingen farve —</option>
              {PRESET_COLOR_TOKENS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} · {p.value} · {p.sample}
                </option>
              ))}
              <option value={CUSTOM_COLOR_TOKEN_VALUE}>Brugerdefineret token / farve…</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-quiet">
              <PulseIconChevronDown size={12} />
            </span>
          </div>

          {mode && mode !== CUSTOM_COLOR_TOKEN_VALUE ? (
            <p className="text-[11px] tabular-nums text-fg-quiet">
              {PRESET_COLOR_TOKENS.find((p) => p.value === mode)?.sample ?? displayColor ?? "—"}
            </p>
          ) : null}

          {mode === CUSTOM_COLOR_TOKEN_VALUE ? (
            <div className="space-y-2 rounded-lg border border-border-soft bg-surface-muted/40 p-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">
                  Eget token-navn
                </span>
                <input
                  type="text"
                  value={customToken.startsWith("#") ? "" : customToken}
                  placeholder="fx mit-brand eller agency-dep-ny"
                  onChange={(e) => handleCustomTokenChange(e.target.value)}
                  className={cn(
                    "h-10 w-full rounded-lg border border-border bg-surface-card px-3",
                    "font-sans text-[13px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
                  )}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-soft">
                  Eller vælg hex-farve
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    value={customHex}
                    onChange={(e) => handleCustomHexChange(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-surface-card p-1"
                    aria-label="Vælg farve"
                  />
                  <input
                    type="text"
                    value={customHex}
                    onChange={(e) => handleCustomHexChange(e.target.value)}
                    className={cn(
                      "h-10 min-w-[7rem] flex-1 rounded-lg border border-border bg-surface-card px-3",
                      "text-[13px] tabular-nums text-fg outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
                    )}
                  />
                </div>
              </label>
              <p className="font-sans text-[11px] text-fg-quiet">Gemmes som token-streng — hex eller eget navn.</p>
            </div>
          ) : null}
        </div>
      </div>
      {hint ? <span className="font-sans text-[11px] text-fg-quiet">{hint}</span> : null}
    </div>
  );
}
