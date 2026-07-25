// Ported from psych_battery/src/lib/api.ts, adapted for in-process routes:
//
// - No more `Authorization: Bearer <token>` header / `localStorage.getItem('auth_token')`.
//   The session is an httpOnly cookie (shared with the rest of ssb-platform)
//   that attaches automatically to same-origin fetch calls.
// - `auth.me`/`auth.login`/`auth.register` are dropped entirely — the SSO
//   handoff is collapsed (see MIGRATION-PHASES.md Phase 5), and every
//   psych-battery page now gets its user server-side via getCurrentUser()
//   fed through PsychUserProvider, never via a client fetch.
// - Legacy called `/api/assessments`, `/api/submissions`, etc. — Phase 2
//   ported psych-battery's own API routes under the `/api/psych/*` prefix to
//   avoid clashing with the main site's own `/api/*` route shapes, so every
//   endpoint below is prefixed accordingly.
// - `upload.file` no longer cross-origin-posts to `https://api.ssbwithisv.in`
//   (that hack existed only because the old Vercel deployment had no
//   persistent disk) — it now hits the in-process
//   `/api/psych/uploadBatteryImage` route directly, which writes straight to
//   this app's own local disk (this app deploys to a persistent VPS, so it
//   has one).

const PSYCH_BASE = "/api/psych";

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(`${PSYCH_BASE}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  assessments: {
    list: () => fetchWithAuth("/assessments"),
    get: (id: string) => fetchWithAuth(`/assessments/${id}`),
    create: (data: unknown) => fetchWithAuth("/assessments", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) => fetchWithAuth(`/assessments/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    duplicate: (id: string) => fetchWithAuth(`/assessments/${id}/duplicate`, { method: "POST" }),
    delete: (id: string) => fetchWithAuth(`/assessments/${id}`, { method: "DELETE" }),
    slides: (id: string) => fetchWithAuth(`/assessments/${id}/slides`),
    slidesByModule: (id: string, moduleId: string) => fetchWithAuth(`/assessments/${id}/slides?module=${moduleId}`),
    saveSlidesBatch: (id: string, slides: unknown[]) =>
      fetchWithAuth(`/assessments/${id}/slides/batch`, { method: "POST", body: JSON.stringify({ slides }) }),
    saveModuleSlidesBatch: (id: string, moduleId: string, slides: unknown[]) =>
      fetchWithAuth(`/assessments/${id}/slides/batch-module`, { method: "POST", body: JSON.stringify({ slides, module: moduleId }) }),
  },
  submissions: {
    list: () => fetchWithAuth("/submissions"),
    get: (id: string) => fetchWithAuth(`/submissions/${id}`),
    create: (data: unknown) => fetchWithAuth("/submissions", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) => fetchWithAuth(`/submissions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    complete: (id: string) => fetchWithAuth(`/submissions/${id}/complete`, { method: "POST" }),
    broadcast: (id: string, data?: unknown) =>
      fetchWithAuth(`/submissions/${id}/broadcast`, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
    audit: (id: string, data: unknown) => fetchWithAuth(`/submissions/${id}/audit`, { method: "POST", body: JSON.stringify(data) }),
  },
  meetings: {
    list: (params: Record<string, unknown> = {}) => {
      const query = new URLSearchParams();
      Object.keys(params).forEach((key) => {
        const value = params[key];
        if (value !== undefined && value !== null && value !== "") {
          query.set(key, String(value));
        }
      });
      return fetchWithAuth(`/meetings?${query.toString()}`);
    },
  },
  users: {
    list: () => fetchWithAuth("/users"),
    update: (id: string, data: unknown) => fetchWithAuth(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },
  notifications: {
    list: () => fetchWithAuth("/notifications"),
    markAsRead: (id: string) => fetchWithAuth(`/notifications/${id}/read`, { method: "PUT" }),
    markAllAsRead: () => fetchWithAuth("/notifications/read-all", { method: "PUT" }),
  },
  upload: {
    file: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${PSYCH_BASE}/uploadBatteryImage`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Upload failed");
      }
      return response.json();
    },
  },
};
