// Coalesce refreshes and limit upstream calls on each running server instance.
const entries = new Map<
  string,
  { expiresAt: number; promise: Promise<unknown> }
>();

export function cachedData<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>
): Promise<T> {
  const existing = entries.get(key);
  if (existing && existing.expiresAt > Date.now())
    return existing.promise as Promise<T>;
  const promise = load().catch((error) => {
    entries.delete(key);
    throw error;
  });
  entries.set(key, { expiresAt: Date.now() + ttlMs, promise });
  return promise;
}
