"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * @param {{ token: string }} props
 */
export function NpsSurveyClient({ token }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [status, setStatus] = useState(/** @type {'pending' | 'answered' | 'expired' | 'invalid'} */ ("pending"));
  const [firstName, setFirstName] = useState("der");
  const [clientName, setClientName] = useState("Searchmind");
  const [score, setScore] = useState(/** @type {number | null} */ (null));
  const [comment, setComment] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/nps/respond/${encodeURIComponent(token)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke åbne linket");

      const st = typeof data?.status === "string" ? data.status : "invalid";
      setStatus(
        st === "pending" || st === "answered" || st === "expired" || st === "invalid" ? st : "invalid",
      );
      if (typeof data?.firstName === "string") setFirstName(data.firstName);
      if (typeof data?.clientName === "string") setClientName(data.clientName);
    } catch (err) {
      setStatus("invalid");
      setError(err instanceof Error ? err.message : "Fejl");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const submit = useCallback(async () => {
    if (score == null) {
      setError("Vælg en score mellem 1 og 10");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/nps/respond/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comment: comment.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke sende svar");
      setStatus("answered");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
    } finally {
      setSubmitting(false);
    }
  }, [comment, score, token]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="font-sans text-[14px] text-fg-muted">Indlæser…</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <SurveyShell>
        <h1 className="font-sans text-[20px] font-semibold text-fg">Linket virker ikke</h1>
        <p className="mt-2 font-sans text-[14px] leading-relaxed text-fg-muted">
          Undersøgelseslinket er ugyldigt eller findes ikke. Brug linket fra den e-mail du har modtaget, eller kontakt
          Searchmind hvis du mener det er en fejl.
        </p>
        {error ?
          <p className="mt-3 font-sans text-[12px] text-agency-bad">{error}</p>
        : null}
      </SurveyShell>
    );
  }

  if (status === "expired") {
    return (
      <SurveyShell>
        <h1 className="font-sans text-[20px] font-semibold text-fg">Linket er udløbet</h1>
        <p className="mt-2 font-sans text-[14px] leading-relaxed text-fg-muted">
          Denne NPS-undersøgelse kan ikke længere besvares. Kontakt Searchmind hvis du stadig vil give feedback.
        </p>
      </SurveyShell>
    );
  }

  if (status === "answered") {
    return (
      <SurveyShell>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-agency-ok-border bg-agency-ok-soft text-agency-ok">
          ✓
        </div>
        <h1 className="mt-4 font-sans text-[22px] font-semibold tracking-tight text-fg">Tak for din besvarelse</h1>
        <p className="mt-2 font-sans text-[14px] leading-relaxed text-fg-muted">
          Vi sætter stor pris på din feedback. Dit svar er registreret og hjælper os med at forbedre samarbejdet med{" "}
          {clientName}.
        </p>
      </SurveyShell>
    );
  }

  return (
    <SurveyShell>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">NPS · Searchmind</p>
      <h1 className="mt-2 font-sans text-[22px] font-semibold tracking-tight text-fg md:text-[24px]">
        Hej {firstName}
      </h1>
      <p className="mt-3 font-sans text-[14px] leading-relaxed text-fg-muted">
        Hvor sandsynligt er det, at du vil anbefale Searchmind til en kollega eller ven? Vælg en score fra 1 (meget
        usandsynligt) til 10 (meget sandsynligt).
      </p>

      <div className="mt-6">
        <p className="font-sans text-[12px] font-medium text-fg-muted">Din score</p>
        <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setScore(n)}
              className={cn(
                "flex h-11 items-center justify-center rounded-lg border font-sans text-[15px] font-semibold tabular-nums transition-colors sm:h-12",
                score === n ?
                  "border-agency-brand-border bg-agency-brand-soft text-agency-brand"
                : "border-border bg-surface-muted text-fg hover:border-agency-brand-border hover:bg-agency-brand-soft/60",
              )}
              aria-pressed={score === n}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-between font-sans text-[10px] text-fg-quiet">
          <span>1 · Usandsynligt</span>
          <span>10 · Meget sandsynligt</span>
        </div>
      </div>

      <label className="mt-6 block">
        <span className="font-sans text-[12px] font-medium text-fg-muted">
          Kommentar <span className="font-normal text-fg-quiet">(valgfri)</span>
        </span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Fortæl gerne kort, hvad der ligger bag din score…"
          className={cn(
            "mt-2 w-full resize-y rounded-lg border border-border bg-surface-muted px-3 py-2.5",
            "font-sans text-[14px] text-fg placeholder:text-fg-quiet",
            "outline-none focus-visible:ring-2 focus-visible:ring-agency-brand",
          )}
        />
      </label>

      {error ?
        <p className="mt-3 rounded-lg border border-agency-bad-border bg-agency-bad-soft px-3 py-2 font-sans text-[12px] text-agency-bad">
          {error}
        </p>
      : null}

      <button
        type="button"
        disabled={submitting || score == null}
        onClick={() => void submit()}
        className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg border border-agency-brand-border bg-agency-brand-soft px-4 font-sans text-[14px] font-semibold text-agency-brand disabled:opacity-50 sm:w-auto sm:min-w-[180px]"
      >
        {submitting ? "Sender…" : "Send svar"}
      </button>

      <p className="mt-6 font-sans text-[11px] leading-snug text-fg-quiet">
        Dit svar kan kun indsendes én gang via dette link. Linket er personligt og knyttet til den e-mail, du modtog.
      </p>
    </SurveyShell>
  );
}

/** @param {{ children: import('react').ReactNode }} props */
function SurveyShell({ children }) {
  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-border bg-canvas p-6 shadow-sm md:p-8">
      {children}
    </div>
  );
}
