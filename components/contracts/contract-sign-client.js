"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * @param {{ token: string }} props
 */
export function ContractSignClient({ token }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [status, setStatus] = useState(
    /** @type {'pending' | 'unlocked' | 'signed' | 'expired' | 'invalid'} */ ("pending"),
  );
  const [clientName, setClientName] = useState("Kunden");
  const [contractLabel, setContractLabel] = useState("Aftale");
  const [signerEmail, setSignerEmail] = useState("");
  const [documentBodyMd, setDocumentBodyMd] = useState("");
  const [consentText, setConsentText] = useState("");

  const [accessCode, setAccessCode] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [signerCompany, setSignerCompany] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);

  const applyPayload = useCallback((data) => {
    const st = typeof data?.status === "string" ? data.status : "invalid";
    setStatus(
      st === "pending" || st === "unlocked" || st === "signed" || st === "expired" || st === "invalid"
        ? st
        : "invalid",
    );
    if (typeof data?.clientName === "string") setClientName(data.clientName);
    if (typeof data?.contractLabel === "string") setContractLabel(data.contractLabel);
    if (typeof data?.signerEmail === "string") setSignerEmail(data.signerEmail);
    if (typeof data?.signerNameHint === "string" && data.signerNameHint) {
      setSignerName((prev) => prev || data.signerNameHint);
    }
    if (typeof data?.documentBodyMd === "string") setDocumentBodyMd(data.documentBodyMd);
    if (typeof data?.consentText === "string") setConsentText(data.consentText);
    if (typeof data?.clientName === "string") {
      setSignerCompany((prev) => prev || data.clientName);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/sign/${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok && data?.status !== "invalid") {
        throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke åbne linket");
      }
      applyPayload(data);
    } catch (err) {
      setStatus("invalid");
      setError(err instanceof Error ? err.message : "Fejl");
    } finally {
      setLoading(false);
    }
  }, [applyPayload, token]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const unlock = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/sign/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unlock", accessCode: accessCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Forkert kode");
      applyPayload(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
    } finally {
      setBusy(false);
    }
  }, [accessCode, applyPayload, token]);

  const sign = useCallback(async () => {
    if (!consentAccepted) {
      setError("Du skal acceptere erklæringen for at underskrive");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/sign/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "sign",
          signerName: signerName.trim(),
          signerTitle: signerTitle.trim() || undefined,
          signerCompany: signerCompany.trim() || undefined,
          consentAccepted: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Kunne ikke underskrive");
      setStatus("signed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl");
    } finally {
      setBusy(false);
    }
  }, [consentAccepted, signerCompany, signerName, signerTitle, token]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="font-sans text-[14px] text-fg-muted">Indlæser…</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <Shell>
        <h1 className="font-sans text-[20px] font-semibold text-fg">Linket virker ikke</h1>
        <p className="mt-2 font-sans text-[14px] leading-relaxed text-fg-muted">
          Underskriftslinket er ugyldigt eller tilbagekaldt. Brug linket fra e-mailen, eller kontakt Searchmind.
        </p>
        {error ? <p className="mt-3 font-sans text-[12px] text-agency-bad">{error}</p> : null}
      </Shell>
    );
  }

  if (status === "expired") {
    return (
      <Shell>
        <h1 className="font-sans text-[20px] font-semibold text-fg">Linket er udløbet</h1>
        <p className="mt-2 font-sans text-[14px] leading-relaxed text-fg-muted">
          Bed Searchmind om at sende et nyt underskriftslink.
        </p>
      </Shell>
    );
  }

  if (status === "signed") {
    return (
      <Shell>
        <h1 className="font-sans text-[20px] font-semibold text-fg">Aftalen er underskrevet</h1>
        <p className="mt-2 font-sans text-[14px] leading-relaxed text-fg-muted">
          Tak. Din elektroniske underskrift er registreret for <strong>{contractLabel}</strong> ({clientName}).
          Searchmind har modtaget bekræftelsen.
        </p>
      </Shell>
    );
  }

  if (status === "pending") {
    return (
      <Shell>
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Searchmind</p>
        <h1 className="mt-1 font-sans text-[20px] font-semibold text-fg">Bekræft adgang</h1>
        <p className="mt-2 font-sans text-[14px] leading-relaxed text-fg-muted">
          Du er ved at åbne <strong>{contractLabel}</strong> for {clientName}. Indtast adgangskoden fra e-mailen.
        </p>
        <label className="mt-5 block font-sans text-[12px] font-medium text-fg-muted">
          Adgangskode (6 cifre)
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="mt-1.5 w-full rounded-xl border border-border bg-canvas px-3 py-2.5 font-mono text-[18px] tracking-[0.35em] text-fg outline-none focus:border-fg/40"
            placeholder="••••••"
          />
        </label>
        {error ? <p className="mt-3 font-sans text-[12px] text-agency-bad">{error}</p> : null}
        <button
          type="button"
          disabled={busy || accessCode.length !== 6}
          onClick={() => void unlock()}
          className={cn(
            "mt-5 w-full rounded-lg border border-agency-brand-border bg-agency-brand-soft px-4 py-2.5 font-sans text-[13px] font-semibold text-agency-brand transition hover:bg-agency-brand-soft/80",
            (busy || accessCode.length !== 6) && "opacity-50",
          )}
        >
          {busy ? "Tjekker…" : "Fortsæt"}
        </button>
      </Shell>
    );
  }

  return (
    <Shell wide>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-soft">Elektronisk underskrift</p>
      <h1 className="mt-1 font-sans text-[20px] font-semibold text-fg">{contractLabel}</h1>
      <p className="mt-1 font-sans text-[13px] text-fg-muted">
        {clientName}
        {signerEmail ? ` · ${signerEmail}` : ""}
      </p>

      <div className="mt-6 max-h-[min(48vh,420px)] overflow-y-auto rounded-xl border border-border bg-surface-muted/40 p-4">
        <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-fg">
          {documentBodyMd || "Ingen kontrakttekst."}
        </pre>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label="Fulde navn *">
          <input
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-canvas px-3 py-2.5 font-sans text-[13px] text-fg outline-none focus:border-fg/40"
            required
          />
        </Field>
        <Field label="Titel / rolle">
          <input
            value={signerTitle}
            onChange={(e) => setSignerTitle(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-canvas px-3 py-2.5 font-sans text-[13px] text-fg outline-none focus:border-fg/40"
          />
        </Field>
        <Field label="Virksomhed">
          <input
            value={signerCompany}
            onChange={(e) => setSignerCompany(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-canvas px-3 py-2.5 font-sans text-[13px] text-fg outline-none focus:border-fg/40"
          />
        </Field>
        <Field label="E-mail">
          <input
            value={signerEmail}
            readOnly
            className="mt-1.5 w-full rounded-xl border border-border bg-canvas px-3 py-2.5 font-sans text-[13px] text-fg opacity-70 outline-none"
          />
        </Field>
      </div>

      <label className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-canvas p-3">
        <input
          type="checkbox"
          checked={consentAccepted}
          onChange={(e) => setConsentAccepted(e.target.checked)}
          className="mt-1"
        />
        <span className="font-sans text-[12px] leading-relaxed text-fg-muted">
          {consentText ||
            "Jeg bekræfter, at jeg er berettiget til at indgå aftalen, og at min elektroniske underskrift er bindende."}
        </span>
      </label>

      <p className="mt-3 font-sans text-[11px] leading-relaxed text-fg-quiet">
        Ved underskrift registreres navn, e-mail, tidspunkt, IP-adresse og en hash af dokumentet som bevis
        (simpel elektronisk underskrift / eIDAS SES).
      </p>

      {error ? <p className="mt-3 font-sans text-[12px] text-agency-bad">{error}</p> : null}

      <button
        type="button"
        disabled={busy || !consentAccepted || signerName.trim().length < 2}
        onClick={() => void sign()}
        className={cn(
          "mt-5 w-full rounded-lg border border-agency-brand-border bg-agency-brand-soft px-4 py-2.5 font-sans text-[13px] font-semibold text-agency-brand transition hover:bg-agency-brand-soft/80",
          (busy || !consentAccepted || signerName.trim().length < 2) && "opacity-50",
        )}
      >
        {busy ? "Underskriver…" : "Underskriv aftalen"}
      </button>
    </Shell>
  );
}

/**
 * @param {{ children: import('react').ReactNode; wide?: boolean }} props
 */
function Shell({ children, wide = false }) {
  return (
    <div
      className={cn(
        "mx-auto w-full rounded-2xl border border-border bg-canvas p-6 shadow-sm md:p-8",
        wide ? "max-w-2xl" : "max-w-lg",
      )}
    >
      {children}
    </div>
  );
}

/**
 * @param {{ label: string; children: import('react').ReactNode }} props
 */
function Field({ label, children }) {
  return (
    <label className="block font-sans text-[12px] font-medium text-fg-muted">
      {label}
      {children}
    </label>
  );
}
