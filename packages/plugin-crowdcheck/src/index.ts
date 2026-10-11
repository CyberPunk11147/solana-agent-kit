import type { Action, Plugin, SolanaAgentKit } from "solana-agent-kit";
import { z } from "zod";
import { CrowdCheckApi, type CrowdCheckOptions } from "./api";

export * from "./api";

const schema = z.object({
  token: z
    .string()
    .nonempty()
    .describe("Token mint address (Solana) or contract address (EVM)"),
  chain: z.enum(["solana", "base", "ethereum", "robinhood"]).default("solana"),
});

/**
 * Crowd Check for Solana Agent Kit: check a token before buying. Returns ok, caution or avoid with a risk score 0-100, reasons and flags.
 * Pays 0.03 USDC per verdict over x402 when given an x402 v2 fetch, or use { freeTrial: true } (3 calls a day per IP, no wallet).
 */
export function crowdcheck(options: CrowdCheckOptions = {}): Plugin {
  const api = new CrowdCheckApi({ source: "solana-agent-kit", ...options });

  const getTokenVerdict = async (
    _agent: SolanaAgentKit,
    token: string,
    chain: "solana" | "base" | "ethereum" | "robinhood" = "solana",
  ) => api.getVerdict(chain, token);

  const action: Action = {
    name: "CROWDCHECK_GET_TOKEN_VERDICT_ACTION",
    description:
      "Check a token before buying it: ok, caution or avoid, with a risk score, reasons and flags (pool can be pulled, serial launcher, bundled supply). Not financial advice.",
    similes: [
      "check token before buying",
      "is this token safe",
      "crowd check",
      "rug check a token",
    ],
    examples: [
      [
        {
          input: {
            token: "So11111111111111111111111111111111111111112",
            chain: "solana",
          },
          output: {
            status: "success",
            result: { verdict: "caution", risk_score: 60 },
          },
          explanation: "Get the Crowd Check verdict for a Solana token",
        },
      ],
    ],
    schema,
    handler: async (agent, input) => {
      try {
        const parsed = schema.parse(input);
        return {
          status: "success",
          result: await getTokenVerdict(agent, parsed.token, parsed.chain),
        };
      } catch (e) {
        return {
          status: "error",
          message: e instanceof Error ? e.message : String(e),
        };
      }
    },
  };

  return {
    name: "crowdcheck",
    methods: { getTokenVerdict },
    actions: [action],
    initialize: () => {
      // nothing to set up: the plugin only calls the Crowd Check HTTP API
    },
  };
}

export default crowdcheck;
