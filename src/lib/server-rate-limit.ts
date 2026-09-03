import "server-only";

type RateLimitEntry = { count: number; resetsAt: number };

const entries = new Map<string, RateLimitEntry>();

// This is a small best-effort burst guard for the reporting endpoint. A
// distributed limiter (for example Upstash/Vercel Firewall) is still required
// before a public beta with untrusted traffic.
export function allowBurst(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  const current = entries.get(key);
  if (!current || current.resetsAt <= now) {
    entries.set(key, { count: 1, resetsAt: now + windowMs });
    return true;
  }
  if (current.count >= maxRequests) return false;
  current.count += 1;
  return true;
}
