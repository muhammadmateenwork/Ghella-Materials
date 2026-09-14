/** Raw errors from Supabase/fetch/Postgres read like debug output, not
 * something to show a warehouse worker ("Failed to send a request to the
 * Edge Function", "duplicate key value violates unique constraint ..."). This
 * rewrites the known technical patterns into plain language and leaves
 * everything else — including our own hand-written, already-friendly error
 * messages — untouched. */
const FRIENDLY_ERROR_RULES: { pattern: RegExp; message: string }[] = [
  {
    pattern: /failed to send a request to the edge function/i,
    message: "Couldn't reach the server. Check your internet connection and try again.",
  },
  {
    pattern: /failed to fetch|network request failed|networkerror|load failed|fetch failed/i,
    message: "Couldn't reach the server. Check your internet connection and try again.",
  },
  {
    pattern: /jwt expired|invalid jwt|session.*(missing|expired)/i,
    message: "Your session has expired. Please sign in again.",
  },
  {
    pattern: /permission denied for (table|relation)/i,
    message: "You don't have permission to do that.",
  },
  {
    pattern: /duplicate key value violates unique constraint/i,
    message: "That already exists.",
  },
];

export function getFriendlyErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const rule = FRIENDLY_ERROR_RULES.find(({ pattern }) => pattern.test(raw));
  if (rule) return rule.message;
  return raw.trim() || "Something went wrong. Please try again.";
}

/**
 * supabase-js's functions.invoke() error carries the raw HTTP Response on
 * `.context`, not the JSON error message the function actually returned —
 * without this, every edge-function failure would surface as a generic
 * "non-2xx status code" instead of e.g. "Email already registered".
 */
export async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const body = await context.clone().json();
        if (typeof body?.error === "string") return body.error;
      } catch {
        // fall through to the generic message below
      }
    }
  }
  return error instanceof Error ? error.message : "Something went wrong";
}
