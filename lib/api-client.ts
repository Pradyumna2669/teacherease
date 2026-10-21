// Shared JSON POST helper.
//
// Every client here used to call `await res.json()` unguarded. That works right
// up until something in front of the route replies in plain text — a 413 from
// the platform's body-size check, a 502 HTML page from the edge, a gateway
// timeout — and then the teacher sees:
//
//     Unexpected token 'R', "Request En"... is not valid JSON
//
// which tells them nothing and tells us nothing. Parse defensively and turn the
// common infrastructure statuses into sentences a teacher can act on.

export class ApiError extends Error {
  status: number;
  /** Extra fields the route returned alongside `error` (e.g. upgrade, needed). */
  payload: Record<string, unknown>;

  constructor(message: string, status: number, payload: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function messageForStatus(status: number, raw: string): string {
  // Non-JSON bodies are almost always infrastructure, not our routes.
  if (status === 413) {
    return "Those photos were too large to upload. Try fewer pages, or retake them in better light.";
  }
  if (status === 504 || status === 408) {
    return "That took too long and timed out. Try again with fewer pages.";
  }
  if (status === 502 || status === 503) {
    return "The service is busy right now. Please try again in a moment.";
  }
  if (status === 401) return "Please sign in and try again.";
  if (status === 429) return "Too many requests. Wait a moment and try again.";
  const snippet = raw.trim().slice(0, 120);
  return snippet
    ? `Request failed (${status}). ${snippet}`
    : `Request failed (${status}). Please try again.`;
}

/**
 * POST JSON and parse JSON back, raising ApiError with a human message on any
 * failure — including responses that were never JSON to begin with.
 */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0
    );
  }

  const raw = await res.text();
  let data: Record<string, unknown> | null = null;
  try {
    data = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    // Body was not JSON — infrastructure spoke instead of our route.
    throw new ApiError(messageForStatus(res.status, raw), res.status);
  }

  if (!res.ok) {
    const msg =
      typeof data?.error === "string" && data.error
        ? data.error
        : messageForStatus(res.status, raw);
    throw new ApiError(msg, res.status, data ?? {});
  }

  return (data ?? {}) as T;
}
