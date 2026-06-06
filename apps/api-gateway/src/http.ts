export async function postJson<TBody, TResponse>(
  url: string,
  body: TBody,
  opts?: { timeoutMs?: number; retries?: number }
): Promise<TResponse> {
  const timeoutMs = opts?.timeoutMs ?? 8_000;
  const retries = opts?.retries ?? 1;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status}) for ${url}`);
      }

      return (await response.json()) as TResponse;
    } catch (error) {
      lastError = error as Error;
      if (attempt > retries) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 350));
    }
  }

  throw new Error(lastError?.message ?? `Request failed for ${url}`);
}
