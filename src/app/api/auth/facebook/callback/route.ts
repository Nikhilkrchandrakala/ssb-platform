import { NextRequest } from "next/server";
import { oauthCallback } from "@/server/integrations/oauth";

export async function GET(req: NextRequest) {
  return oauthCallback("facebook", req);
}
