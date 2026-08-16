import axios from "axios";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { User } from "@/server/models/User";
import { signSessionToken, setSessionCookie, COOKIE_DOMAIN } from "@/server/auth";

export type OAuthProvider = "google" | "facebook" | "linkedin";

interface ProviderConfig {
  clientId: string | undefined;
  clientSecret: string | undefined;
  authorizeUrl: string;
  scope: string;
  extraAuthParams?: Record<string, string>;
}

function callbackUrl(provider: OAuthProvider): string {
  const base = process.env.API_BASE_URL || process.env.CLIENT_URL || "http://localhost:3000";
  return `${base}/api/auth/${provider}/callback`;
}

function config(provider: OAuthProvider): ProviderConfig {
  switch (provider) {
    case "google":
      return {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        scope: "openid profile email",
        extraAuthParams: { access_type: "online", prompt: "select_account" },
      };
    case "facebook":
      return {
        clientId: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
        scope: "email public_profile",
      };
    case "linkedin":
      return {
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
        scope: "openid profile email",
      };
  }
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  const c = config(provider);
  return !!(c.clientId && c.clientSecret);
}

/** Builds the provider's consent-screen redirect URL. `state` is a CSRF token the caller must also stash in a short-lived cookie. */
export function buildAuthorizeUrl(provider: OAuthProvider, state: string): string {
  const c = config(provider);
  const params = new URLSearchParams({
    client_id: c.clientId || "",
    redirect_uri: callbackUrl(provider),
    response_type: "code",
    scope: c.scope,
    state,
    ...(c.extraAuthParams || {}),
  });
  return `${c.authorizeUrl}?${params.toString()}`;
}

export interface OAuthProfile {
  oauthId: string;
  email: string | null;
  name: string;
  profileImage: string | null;
}

async function exchangeCode(provider: OAuthProvider, code: string): Promise<string> {
  const c = config(provider);
  const redirectUri = callbackUrl(provider);

  if (provider === "google") {
    const { data } = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: c.clientId,
      client_secret: c.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    return data.access_token;
  }

  if (provider === "facebook") {
    const { data } = await axios.get("https://graph.facebook.com/v19.0/oauth/access_token", {
      params: { client_id: c.clientId, client_secret: c.clientSecret, redirect_uri: redirectUri, code },
    });
    return data.access_token;
  }

  // linkedin
  const { data } = await axios.post(
    "https://www.linkedin.com/oauth/v2/accessToken",
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: c.clientId || "",
      client_secret: c.clientSecret || "",
    }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return data.access_token;
}

async function fetchProfile(provider: OAuthProvider, accessToken: string): Promise<OAuthProfile> {
  if (provider === "google") {
    const { data } = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return {
      oauthId: data.id,
      email: data.email || null,
      name: data.name || "Google User",
      profileImage: data.picture || null,
    };
  }

  if (provider === "facebook") {
    const { data } = await axios.get("https://graph.facebook.com/me", {
      params: { fields: "id,name,email,picture", access_token: accessToken },
    });
    return {
      oauthId: data.id,
      email: data.email || null,
      name: data.name || "Facebook User",
      profileImage: data.picture?.data?.url || null,
    };
  }

  // linkedin — OpenID Connect userinfo endpoint (scope: openid profile email)
  const { data } = await axios.get("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return {
    oauthId: data.sub,
    email: data.email || null,
    name: data.name || "LinkedIn User",
    profileImage: data.picture || null,
  };
}

export async function completeOAuthLogin(provider: OAuthProvider, code: string) {
  const accessToken = await exchangeCode(provider, code);
  const profile = await fetchProfile(provider, accessToken);
  return findOrCreateOAuthUser({ provider, ...profile });
}

/** Mirrors the legacy passport.config.js `findOrCreateOAuthUser`: match by provider+id, else link by email, else create a new lead. */
async function findOrCreateOAuthUser(params: {
  provider: OAuthProvider;
  oauthId: string;
  email: string | null;
  name: string;
  profileImage: string | null;
}) {
  await connectDB();
  const { provider, oauthId, email, name, profileImage } = params;

  let user = await User.findOne({ oauthProvider: provider, oauthId });

  if (!user && email) {
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    user = await User.findOne({ email: { $regex: new RegExp(`^${escaped}$`, "i") } });
    if (user) {
      user.oauthProvider = user.oauthProvider || provider;
      user.oauthId = user.oauthId || oauthId;
      if (!user.profileImage && profileImage) user.profileImage = profileImage;
      await user.save();
    }
  }

  if (!user) {
    user = new User({
      name: name || "User",
      email: email || `${provider}_${oauthId}@noemail.local`,
      oauthProvider: provider,
      oauthId,
      profileImage,
      phoneVerified: false,
      emailVerified: true,
      role: "lead",
    });
    await user.save();
  }

  return user;
}

const OAUTH_STATE_COOKIE = "oauth_state";

/**
 * Redirect handler for GET /api/auth/[provider] — replaces Passport's
 * `session: true` handshake with a plain CSRF-state cookie, per the Phase 2
 * plan ("Route Handlers + a short-lived state cookie for the handshake").
 */
export async function oauthAuthorizeRedirect(provider: OAuthProvider): Promise<NextResponse> {
  const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

  if (!isProviderConfigured(provider)) {
    return NextResponse.redirect(`${CLIENT_URL}/SignIn?oauthError=true`);
  }

  const state = crypto.randomBytes(24).toString("hex");
  const store = await cookies();
  store.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: COOKIE_DOMAIN,
    maxAge: 10 * 60, // 10 min handshake window
  });

  return NextResponse.redirect(buildAuthorizeUrl(provider, state));
}

/** Builds the same post-login redirect the legacy `buildRedirectUrl` produced: straight to a session for existing verified users, or a temp-token phone-verify hop for brand new social signups. */
function buildPostLoginRedirect(user: { _id: unknown; phone?: string; phoneVerified?: boolean; name?: string; email?: string; role?: string }): { redirectUrl: string; sessionToken: string | null } {
  const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
  const needsPhone = !user.phone || !user.phoneVerified;

  if (needsPhone) {
    const tempToken = jwt.sign({ id: String(user._id), needsPhone: true }, (process.env.JWT_SECRET || "").trim(), {
      expiresIn: "15m",
    });
    const name = encodeURIComponent(user.name || "");
    const email = encodeURIComponent(user.email || "");
    return { redirectUrl: `${CLIENT_URL}/auth/phone-verify?temp=${tempToken}&name=${name}&email=${email}`, sessionToken: null };
  }

  const sessionToken = signSessionToken({ id: String(user._id), role: user.role || "lead" });
  return { redirectUrl: `${CLIENT_URL}/auth/callback`, sessionToken };
}

/** Callback handler for GET /api/auth/[provider]/callback. */
export async function oauthCallback(provider: OAuthProvider, req: NextRequest): Promise<NextResponse> {
  const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const store = await cookies();
  const savedState = store.get(OAUTH_STATE_COOKIE)?.value;
  store.set(OAUTH_STATE_COOKIE, "", { path: "/", domain: COOKIE_DOMAIN, maxAge: 0 });

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${CLIENT_URL}/SignIn?oauthError=true`);
  }

  try {
    const user = await completeOAuthLogin(provider, code);
    const { redirectUrl, sessionToken } = buildPostLoginRedirect(user);
    if (sessionToken) await setSessionCookie(sessionToken);
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error(`[oauth] ${provider} callback error:`, err instanceof Error ? err.message : err);
    return NextResponse.redirect(`${CLIENT_URL}/SignIn?oauthError=true`);
  }
}
