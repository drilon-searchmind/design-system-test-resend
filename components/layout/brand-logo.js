import { cn } from "@/lib/utils";

export const BRAND_LOGO_SRC = "/images/1337-layers-transparent-dark.svg";
export const BRAND_LOGO_SRC_LIGHT = "/images/1337-layers-transparent-light.svg";

/** Shared logo sizes — sidebar uses collapsed / expanded. */
export const BRAND_LOGO_SIZE = {
  default: 28,
  nav: 28,
  sidebarCollapsed: 28,
  sidebarExpanded: 32,
  card: 32,
  diagram: 24,
};

/**
 * @param {{ size?: number; className?: string }} props
 */
export function BrandLogo({ size = BRAND_LOGO_SIZE.default, className }) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <img
        src={BRAND_LOGO_SRC}
        alt=""
        width={size}
        height={size}
        className="hidden size-full [html[data-theme=dark]_&]:block"
      />
      <img
        src={BRAND_LOGO_SRC_LIGHT}
        alt=""
        width={size}
        height={size}
        className="block size-full [html[data-theme=dark]_&]:hidden"
      />
    </span>
  );
}

/**
 * Centered logo for standalone public flows (contracts, NPS, etc.).
 * @param {{ size?: number; className?: string }} props
 */
export function BrandLogoMark({ size = BRAND_LOGO_SIZE.card, className }) {
  return (
    <div className={cn("mb-6 flex justify-center", className)}>
      <BrandLogo size={size} />
    </div>
  );
}
