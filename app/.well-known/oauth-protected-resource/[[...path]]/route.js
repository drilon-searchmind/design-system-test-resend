import { jsonCors, optionsCors } from "@/lib/mcp/http";
import { publicBaseUrl } from "@/lib/mcp/tokens";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsCors();
}

/** RFC 9728 protected resource metadata (also served for the path-suffixed variant). */
export function GET(req) {
  const base = publicBaseUrl(req);
  return jsonCors({
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp"],
    resource_name: "Agency CRM",
  });
}
