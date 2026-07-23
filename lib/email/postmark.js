import { env } from "@/lib/env";
import {
  contractSigningTextToHtml,
  injectContractSigningLink,
} from "@/lib/email/contract-signing-link";
import { injectNpsSurveyLink, npsSurveyTextToHtml } from "@/lib/email/nps-survey-link";

/**
 * @param {{
 *   to: string;
 *   subject: string;
 *   textBody: string;
 *   tag?: string;
 *   surveyUrl?: string;
 *   signingUrl?: string;
 *   accessCode?: string;
 *   kind?: 'nps' | 'contract';
 * }} opts
 */
export async function sendPostmarkEmail(opts) {
  const token = env.POSTMARK_API_TOKEN;
  if (!token) {
    throw new Error("POSTMARK_API_TOKEN mangler i miljøvariabler");
  }

  const from = env.POSTMARK_FROM_EMAIL;
  if (!from) {
    throw new Error("POSTMARK_FROM_EMAIL mangler i miljøvariabler");
  }

  const kind = opts.kind === "contract" || opts.signingUrl ? "contract" : "nps";

  /** @type {string} */
  let textBody;
  /** @type {string} */
  let htmlBody;

  if (kind === "contract") {
    const vars = {
      signingUrl: opts.signingUrl ?? opts.surveyUrl ?? "",
      accessCode: opts.accessCode ?? "",
    };
    textBody = injectContractSigningLink(opts.textBody, vars);
    htmlBody = contractSigningTextToHtml(opts.textBody, vars);
  } else {
    textBody = injectNpsSurveyLink(opts.textBody, opts.surveyUrl ?? "");
    htmlBody = npsSurveyTextToHtml(opts.textBody, opts.surveyUrl ?? "");
  }

  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify({
      From: from,
      To: opts.to,
      Subject: opts.subject,
      TextBody: textBody,
      HtmlBody: htmlBody,
      MessageStream: "outbound",
      Tag: opts.tag ?? (kind === "contract" ? "contract-signing" : "nps-survey"),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data?.Message === "string" ? data.Message
      : typeof data?.message === "string" ? data.message
      : `Postmark fejl (${res.status})`;
    throw new Error(msg);
  }

  return {
    messageId: typeof data?.MessageID === "string" ? data.MessageID : undefined,
  };
}
