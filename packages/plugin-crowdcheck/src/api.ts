/**
 * Crowd Check API client: one token verdict (ok, caution, avoid) from https://oracle.cyberwarex.com, before an agent buys.
 * Pays per call over x402 (0.03 USDC) when given an x402-aware fetch (for example wrapFetchWithPayment from x402-fetch);
 * with freeTrial it uses the keyless trial (3 calls a day per IP) so developers can try it first.
 * Every request carries ?src=<source> so the service can count which integration a call came from.
 */
export type CrowdCheckChain = "base" | "ethereum" | "robinhood" | "solana";

export interface CrowdCheckOptions {
  /** x402-aware fetch that signs the payment; defaults to global fetch (works only with freeTrial). */
  fetch?: typeof fetch;
  /** Use the keyless free trial header (3 calls a day per IP). */
  freeTrial?: boolean;
  /** Integration label sent as ?src= , default "solana-agent-kit". */
  source?: string;
  baseUrl?: string;
  /** How long to wait for a verdict that is still computing, in ms. */
  maxWaitMs?: number;
}

export class CrowdCheckApi {
  private readonly baseUrl: string;
  private readonly doFetch: typeof fetch;

  constructor(private readonly options: CrowdCheckOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://oracle.cyberwarex.com";
    this.doFetch = options.fetch ?? fetch;
  }

  async getVerdict(chain: CrowdCheckChain, token: string) {
    const url = `${this.baseUrl}/v1/holders/verdict?${new URLSearchParams({ chain, token, src: this.options.source ?? "solana-agent-kit" })}`;
    const headers: Record<string, string> = {};
    if (this.options.freeTrial) {
      headers["X-Free-Trial"] = "1";
    }
    const deadline = Date.now() + (this.options.maxWaitMs ?? 60_000);
    for (;;) {
      const response = await this.doFetch(url, { headers });
      if (response.status === 202) {
        // Not ready yet and not charged: the service asks us to retry.
        const body = (await response.json().catch(() => ({}))) as {
          retry_after_seconds?: number;
        };
        if (Date.now() + 1000 > deadline) {
          throw new Error(
            "Crowd Check verdict still computing, try again shortly",
          );
        }
        await new Promise((r) =>
          setTimeout(
            r,
            Math.min(Math.max(body.retry_after_seconds ?? 10, 2), 20) * 1000,
          ),
        );
        continue;
      }
      if (response.status === 402) {
        throw new Error(
          "Crowd Check needs payment: pass an x402-aware fetch, or set freeTrial for a keyless trial",
        );
      }
      if (!response.ok) {
        throw new Error(
          `Crowd Check request failed: ${response.status} ${response.statusText}`,
        );
      }
      return await response.json();
    }
  }
}
