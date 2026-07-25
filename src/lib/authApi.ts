// Small fetch helper shared by the auth pages (SignIn/SignUp/AccountRecovery/OAuthPhoneVerify).
//
// The legacy site used RTK Query mutations whose `.unwrap()` threw an object
// shaped like `{ data: <json body> }` on a non-2xx response, and existing
// legacy error-handling reads `err?.data?.error` / `err?.data?.message`.
// This helper reproduces that exact shape on top of plain `fetch` so the
// ported error-handling logic below needed minimal changes — while still
// requiring: no auth token is ever read from or written to this response,
// only same-origin cookies (set server-side by the Route Handler) matter.
export class ApiError extends Error {
  data: Record<string, unknown>;
  status: number;
  constructor(message: string, data: Record<string, unknown>, status: number) {
    super(message);
    this.data = data;
    this.status = status;
  }
}

export async function postJSON<T = Record<string, unknown>>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    // Non-JSON response body — leave data as {}.
  }

  if (!res.ok) {
    const message = (data?.error as string) || (data?.message as string) || "Request failed";
    throw new ApiError(message, data, res.status);
  }

  return data as T;
}
