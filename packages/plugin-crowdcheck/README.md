# @solana-agent-kit/plugin-crowdcheck

Check a token before your agent buys it. Returns ok, caution or avoid with a risk score 0-100, the top reasons and flags (the pool can be pulled, serial launcher, trading hook, bundled supply). Solana, Base and Ethereum. Not financial advice.

Service: https://oracle.cyberwarex.com (Crowd Check). Cost: 0.03 USDC per verdict over x402; not charged while the verdict is still computing. The first answer for a brand-new Solana token can take over a minute.

```ts
import crowdcheck from "@solana-agent-kit/plugin-crowdcheck";

// try it without a wallet: 3 calls a day per IP
const agent = new SolanaAgentKit(wallet, rpc, {}).use(crowdcheck({ freeTrial: true }));

// pay per call: the service speaks x402 version 2 (the older x402-fetch package cannot read it)
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
const client = new x402Client().register("eip155:*", new ExactEvmScheme(account)); // viem account holding USDC on Base
const paying = new SolanaAgentKit(wallet, rpc, {}).use(crowdcheck({ fetch: wrapFetchWithPayment(fetch, client) }));

const verdict = await agent.methods.getTokenVerdict(agent, mint, "solana");
```

Options: `fetch`, `freeTrial`, `source` (sent as `?src=`), `baseUrl`, `maxWaitMs`.

Not covered by the check: wash trading, wallets split to hide holdings, off-chain actions.
