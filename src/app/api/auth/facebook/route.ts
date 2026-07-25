import { oauthAuthorizeRedirect } from "@/server/integrations/oauth";

export async function GET() {
  return oauthAuthorizeRedirect("facebook");
}
