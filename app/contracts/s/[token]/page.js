import { ContractSignClient } from "@/components/contracts/contract-sign-client";
import { BrandLogoMark } from "@/components/layout/brand-logo";
import { isValidContractSigningToken } from "@/lib/contracts/signing-token";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Underskriv aftale · Searchmind",
  robots: { index: false, follow: false },
};

/**
 * @param {{ params: Promise<{ token: string }> }} props
 */
export default async function ContractSignPage({ params }) {
  const { token: tokenEncoded } = await params;
  const token = decodeURIComponent(tokenEncoded ?? "");

  if (!isValidContractSigningToken(token)) {
    return (
      <main className={cn("flex flex-1 flex-col px-4 py-10 md:py-16")}>
        <div className="mx-auto w-full max-w-lg rounded-2xl border border-border bg-canvas p-6 shadow-sm md:p-8">
          <BrandLogoMark />
          <h1 className="font-sans text-[20px] font-semibold text-fg">Linket virker ikke</h1>
          <p className="mt-2 font-sans text-[14px] leading-relaxed text-fg-muted">
            Underskriftslinket er ugyldigt. Brug linket fra den e-mail du har modtaget.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={cn("flex flex-1 flex-col px-4 py-10 md:py-16")}>
      <ContractSignClient token={token} />
    </main>
  );
}
