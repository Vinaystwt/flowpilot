# FlowPilot

**Your money. On autopilot.**

FlowPilot is a natural-language DeFi portfolio manager built on Flow blockchain. Tell it your financial goal in plain English. AI builds a personalized strategy. Cadence smart contracts execute it automatically — no wallet, no gas, no complexity.

## Live Demo

**[flowpilot-puce.vercel.app](https://flowpilot-puce.vercel.app)**

## System Architecture
```
User (plain English goal)
        │
        ▼
Next.js 14 Frontend (Vercel)
/ · /confirm · /dashboard · /mutate · /vaults · /attestation · /explore
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│              API Layer — 11 Vercel Serverless Routes            │
│                                                                 │
│  parse-intent    store-strategy    deploy-vault                 │
│  mutate-strategy mint-attestation  vault-health                 │
│  send-report     archive-vault     schedule-rebalance           │
│  generate-report get-vault                                      │
└──────┬──────────────┬──────────────┬──────────────┬────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
   Groq AI         IPFS          Flow Testnet    Supabase
 llama-3.3-70b  NFT.storage    0xf8105fdaa45   PostgreSQL
                               bc140
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
             FlowPilot      FlowPilot      FlowPilot
             Registry        Vault         Scheduler
                                    ▼
                             FeeCollector

Filecoin (Lighthouse) ← archive-vault
Resend ← send-report
```

## How It Works

1. **Tell us your goal** — Plain English. "Grow my $500 by 8% in 6 months. Keep it safe."
2. **AI builds your strategy** — Groq parses intent into a structured DeFi allocation stored on IPFS
3. **Vault deploys on Flow** — 4 Cadence contracts manage vault lifecycle at `0xf8105fdaa45bc140`
4. **Autopilot runs** — Rebalancing scheduled via FlowPilotScheduler on-chain
5. **Mutate anytime** — Type "make it more aggressive" — side-by-side diff shows exactly what changed
6. **Weekly reports** — Plain-English performance digest to your inbox
7. **Attestation** — AI-verified performance record with conviction score minted to IPFS

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing — NL goal input with examples and how-it-works |
| `/confirm` | Strategy review, deployment, auto-schedule on Flow |
| `/dashboard` | Live portfolio with health score, AI analysis, activity feed |
| `/vaults` | Multi-vault portfolio with risk heatmap |
| `/mutate` | AI strategy mutation lab with side-by-side visual diff |
| `/attestation` | AI performance attestation with conviction score minted to IPFS |
| `/explore` | Public vault explorer — all active vaults with stats |

## API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/parse-intent` | Groq NL → strategy JSON |
| `POST /api/store-strategy` | Upload strategy to IPFS (NFT.storage) |
| `POST /api/deploy-vault` | Flow REST API vault registration |
| `POST /api/mutate-strategy` | NL strategy mutation with diff via Groq |
| `POST /api/mint-attestation` | AI verdict + conviction score → IPFS |
| `POST /api/vault-health` | AI-computed 0-100 vault health score |
| `POST /api/generate-report` | Groq plain-English performance analysis |
| `POST /api/send-report` | Weekly HTML email via Resend |
| `POST /api/schedule-rebalance` | Flow on-chain rebalance scheduling |
| `POST /api/archive-vault` | Filecoin archival via Lighthouse |
| `GET  /api/get-vault` | Query Flow testnet for live vault count |

## Smart Contracts — Flow Testnet

All 4 contracts at `0xf8105fdaa45bc140` — [View on Flowscan](https://testnet.flowscan.io/account/0xf8105fdaa45bc140)

| Contract | Purpose |
|----------|---------|
| `FlowPilotRegistry` | Maps vault IDs to IPFS CIDs, tracks total count on-chain |
| `FlowPilotVault` | Strategy parameters, vault lifecycle, event emission |
| `FlowPilotFeeCollector` | 15% performance fee on gains, protocol treasury |
| `FlowPilotScheduler` | On-chain rebalance scheduling, execution tracking |

## Novel Features

**Strategy Mutation Engine** — Users update their DeFi strategy by typing plain English. Groq diffs old vs new strategy and presents a side-by-side visual comparison before confirming. New version uploaded to IPFS as a linked strategy update.

**Performance Attestation** — AI-verified vault performance record with conviction score (0-100) minted to IPFS. Tamper-proof, permanently verifiable proof-of-yield. A new DeFi primitive.

**Vault Health Score** — AI-computed 0-100 health metric factoring return progress, pace vs horizon, concentration risk, and stability. Groq generates a one-sentence explanation.

**Multi-Vault Risk Heatmap** — Portfolio view showing capital distribution across conservative/balanced/growth strategies as a visual heat bar.

**Public Vault Explorer** — Anonymized live view of all active FlowPilot vaults with aggregate stats. Shows protocol traction in real time.

**Conviction Scoring** — Attestations include a conviction multiplier based on return vs target, time elapsed, and strategy type. Foundation for protocol revenue sharing.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 App Router, Tailwind CSS |
| Hosting | Vercel (free tier) |
| Blockchain | Flow Testnet — 4 Cadence contracts |
| AI | Groq llama-3.3-70b-versatile |
| IPFS | NFT.storage + web3.storage fallback |
| Filecoin | Lighthouse.storage archival |
| Database | Supabase PostgreSQL |
| Email | Resend |
| Budget | $0 — 100% free tier |

## Bounty Alignment

### PL Crypto
- AI-managed portfolio with programmable allocation rules
- Novel financial instrument: NL-defined strategy vault
- Performance attestation with conviction scoring as new DeFi primitive
- Protocol revenue via 15% performance fee
- Strategy configs content-addressed on IPFS

### Flow Blockchain
- 4 Cadence contracts on Flow Testnet
- FlowPilotScheduler for native on-chain automation
- Walletless UX — email only, no seed phrases
- Natural language as primary interface
- Gas-free — protocol-sponsored model

### PL Fresh Code
- Brand new codebase, zero prior deployment
- Real IPFS via NFT.storage with Filecoin auto-deals
- Filecoin archival via Lighthouse
- Novel NL-to-Cadence pipeline
- All strategy objects content-addressed and verifiable

## Revenue Model

| Stream | Mechanism |
|--------|-----------|
| Performance fee | 15% of gains above principal at vault close |
| Premium tier | $9/month for advanced strategies |
| B2B API | White-label NL→vault API for fintech partners |

## Local Development
```bash
git clone https://github.com/Vinaystwt/flowpilot
cd flowpilot
npm install
cp .env.example .env.local
npm run dev
```

## License

MIT
