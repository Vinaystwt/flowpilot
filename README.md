# FlowPilot

**Your money. On autopilot.**

FlowPilot is a natural-language DeFi portfolio manager built on Flow blockchain. Tell it your financial goal in plain English. AI builds a personalized strategy. Cadence smart contracts execute it automatically — no wallet, no gas, no complexity.

## Live Demo

**[flowpilot-puce.vercel.app](https://flowpilot-puce.vercel.app)**

## How It Works

1. **Tell us your goal** — Plain English. "Grow my $500 by 8% in 6 months. Keep it safe."
2. **AI builds your strategy** — Groq parses intent into a structured DeFi allocation stored on IPFS
3. **Vault deploys on Flow** — Cadence smart contract registered on-chain
4. **Autopilot runs** — Automated rebalancing, exit protection, yield harvesting
5. **Weekly reports** — Plain-English performance digest to your inbox
6. **Mutate anytime** — Type "make it more aggressive" and AI updates the strategy
7. **Attestation** — AI-verified performance record minted to IPFS

## Features

- Natural language goal input parsed by Groq LLM
- Cadence vault contracts deployed on Flow Testnet
- Strategy configs stored on IPFS (content-addressed)
- Vault histories archived on Filecoin via Lighthouse
- Walletless onboarding — email only, no seed phrases
- Zero gas fees — protocol-sponsored transactions
- Strategy mutation engine — update strategy via plain English
- Multi-vault portfolio view with risk heatmap
- AI performance analysis and attestation system
- Weekly email performance reports via Resend

## Smart Contracts — Flow Testnet

All three contracts deployed at `0xf8105fdaa45bc140`:

| Contract | Purpose |
|----------|---------|
| `FlowPilotRegistry` | Maps users to vault records and IPFS CIDs |
| `FlowPilotFeeCollector` | Collects 15% performance fee on gains |
| `FlowPilotVault` | Manages strategy parameters and vault lifecycle |

[View on Flowscan](https://testnet.flowscan.io/account/0xf8105fdaa45bc140)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS |
| Hosting | Vercel |
| Blockchain | Flow Testnet (Cadence) |
| AI | Groq — llama-3.3-70b-versatile |
| IPFS | web3.storage |
| Filecoin | Lighthouse.storage |
| Database | Supabase |
| Email | Resend |

## API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/parse-intent` | Groq NL → strategy JSON |
| `POST /api/store-strategy` | Upload strategy to IPFS |
| `POST /api/deploy-vault` | Prepare Flow vault params |
| `POST /api/mutate-strategy` | NL strategy mutation via Groq |
| `POST /api/mint-attestation` | Generate IPFS performance attestation |
| `POST /api/generate-report` | AI plain-English performance summary |
| `POST /api/send-report` | Weekly email digest via Resend |
| `POST /api/schedule-rebalance` | Schedule autopilot rebalance |
| `POST /api/archive-vault` | Filecoin archival via Lighthouse |
| `GET /api/get-vault` | Query Flow testnet for vault count |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing — NL goal input |
| `/confirm` | Strategy review and vault deployment |
| `/dashboard` | Live portfolio dashboard |
| `/vaults` | Multi-vault portfolio overview |
| `/mutate` | AI strategy mutation lab |
| `/attestation` | Performance attestation generator |

## Architecture

Three-layer system:

**Intent Layer** — User types a financial goal in plain English. Groq LLM parses it into a structured JSON strategy with allocation percentages, rebalancing thresholds, exit conditions, and time horizons.

**Intelligence Layer** — Strategy JSON is uploaded to IPFS via web3.storage, generating a content-addressed CID. The strategy is verifiable and tamper-proof.

**Execution Layer** — Cadence vault registered on Flow Testnet. Native scheduled transactions handle rebalancing. Filecoin archival preserves completed vault histories.

## Local Development
```bash
git clone https://github.com/Vinaystwt/flowpilot
cd flowpilot
npm install
cp .env.example .env.local
# Fill in your API keys
npm run dev
```

## Revenue Model

- 15% performance fee on gains above principal at vault close
- $9/month premium tier for advanced strategies
- B2B white-label API for fintech partners

## License

MIT
