"use client";

import { useState } from "react";

import { faviconUrl, resolveClientDomain } from "@/lib/crm/client-domain";
import { cn } from "@/lib/utils";

/** Google returnerer en 16px standard-globus når et domæne ikke har et favicon. */
const MIN_FAVICON_PX = 17;

/**
 * Kundelogo: favicon for kundens primære domæne, ellers initialer på farvet baggrund.
 *
 * @param {{
 *   client: {
 *     name?: string;
 *     logo?: string;
 *     hue?: number;
 *     primaryDomain?: string | null;
 *     domains?: Array<{ domain?: string; isPrimary?: boolean }> | null;
 *     clickUpTaskName?: string | null;
 *   };
 *   fallbackDomains?: Array<{ domain?: string; isPrimary?: boolean }>;
 *   variant?: 'solid' | 'gradient';
 *   className?: string;
 * }} props `className` styrer størrelse, radius og tekststørrelse.
 */
export function ClientLogo({ client, fallbackDomains, variant = "gradient", className }) {
  const domain = resolveClientDomain(client, fallbackDomains);
  const [loadedFor, setLoadedFor] = useState("");
  const [failedFor, setFailedFor] = useState("");
  const hue = typeof client.hue === "number" ? client.hue : 220;
  const showFavicon = Boolean(domain) && failedFor !== domain;
  const loaded = showFavicon && loadedFor === domain;

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-border font-semibold text-white",
        loaded && "bg-surface-card",
        className,
      )}
      style={
        loaded ? undefined
        : variant === "solid" ?
          { background: `oklch(62% 0.14 ${hue})` }
        : { background: `linear-gradient(135deg, oklch(62% 0.15 ${hue}), oklch(52% 0.18 ${hue + 28}))` }
      }
      title={domain || undefined}
    >
      <span className={cn(loaded && "invisible")} aria-hidden={loaded}>
        {client.logo ?? String(client.name ?? "?").slice(0, 2).toUpperCase()}
      </span>
      {showFavicon ?
        // eslint-disable-next-line @next/next/no-img-element -- eksternt favicon, ingen next/image-config
        <img
          key={domain}
          src={faviconUrl(domain)}
          alt={client.name ? `${client.name} logo` : ""}
          loading="lazy"
          referrerPolicy="no-referrer"
          className={cn("absolute inset-[18%] size-[64%] object-contain", !loaded && "opacity-0")}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth < MIN_FAVICON_PX) setFailedFor(domain);
            else setLoadedFor(domain);
          }}
          onError={() => setFailedFor(domain)}
        />
      : null}
    </span>
  );
}
