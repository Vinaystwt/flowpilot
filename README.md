<div align="center">

<img src="public/favicon.svg" width="64" height="64" alt="FlowPilot"/>

# FlowPilot

### Your money. On autopilot.

**Natural-language DeFi autopilot on Flow** — tell it your financial goal in plain English, and FlowPilot builds, deploys, and manages your personalized strategy autonomously via Cadence smart contracts. No wallet setup. No gas fees. No complexity.

[![Live Demo](https://img.shields.io/badge/Live_Demo-flowpilot--puce.vercel.app-00d4ff?style=for-the-badge)](https://flowpilot-puce.vercel.app)
[![Flow Testnet](https://img.shields.io/badge/Flow_Testnet-0xf8105fdaa45bc140-7F77DD?style=for-the-badge)](https://testnet.flowscan.io/account/0xf8105fdaa45bc140)
[![GitHub](https://img.shields.io/badge/GitHub-Vinaystwt%2Fflowpilot-white?style=for-the-badge&logo=github)](https://github.com/Vinaystwt/flowpilot)
[![Budget](https://img.shields.io/badge/Budget-%240-00ff88?style=for-the-badge)](https://github.com/Vinaystwt/flowpilot)

</div>

---

## The Problem

200M+ passive investors want DeFi yields but face insurmountable barriers:

- Wallet seed phrases and private key management
- Gas fees and transaction complexity
- Manual protocol monitoring and rebalancing
- Deep crypto knowledge requirements

Every existing solution requires either deep expertise (Yearn, Beefy) or gives up on real yield entirely (Acorns, Robinhood). **The gap: a system that accepts human financial goals and executes them autonomously, invisibly, and safely forever.**

---

## The Solution

FlowPilot is a three-layer system:
```
"Grow my $500 by 8% over 6 months. Keep it safe."
                    |
                    v
         +---------------------+
         |    INTENT LAYER     |
         |  Groq LLM parses    |
         |  plain English ->   |
         |  strategy JSON      |
         +----------+----------+
                    |
                    v
         +---------------------+
         | INTELLIGENCE LAYER  |
         |  Strategy stored    |
         |  on IPFS as a       |
         |  content-addressed  |
         |  tamper-proof CID   |
         +----------+----------+
                    |
                    v
         +---------------------+
         |  EXECUTION LAYER    |
         |  Real FCL browser   |
         |  transaction ->     |
         |  4 Cadence contracts|
         |  on Flow Testnet    |
         |  Schedule rebalance |
         |  Collect 15% fee    |
         +---------------------+
```

---

## Live Demo

**[flowpilot-puce.vercel.app](https://flowpilot-puce.vercel.app)**

Try: type `Grow my $500 by 8% over 6 months. Keep it safe.` and watch the AI build a complete DeFi strategy, store it on IPFS, and deploy it to Flow via a real FCL transaction.

---

## System Architecture
```
User (plain English goal)
        |
        v
+--------------------------------------------------------------+
|              Next.js 14 Frontend (Vercel)                    |
|  /  .  /confirm  .  /dashboard  .  /mutate                  |
|  /vaults  .  /attestation  .  /explore                      |
+----------------------+---------------------------------------+
                       |
                       v
+--------------------------------------------------------------+
|           API Layer - 11 Vercel Serverless Routes            |
|                                                              |
|  parse-intent     store-strategy    deploy-vault             |
|  mutate-strategy  mint-attestation  vault-health             |
|  send-report      archive-vault     schedule-rebalance       |
|  generate-report  get-vault                                  |
+----+---------------+---------------+---------------+---------+
     |               |               |               |
     v               v               v               v
  Groq AI          IPFS          Flow Testnet    Supabase
 llama-3.3-70b  NFT.storage     4 Cadence       PostgreSQL
                Lighthouse      Contracts
                    |               |
                    v               v
               Filecoin      0xf8105fdaa45bc140
               Archival      FlowPilotRegistry
                             FlowPilotVault
                             FlowPilotFeeCollector
                             FlowPilotScheduler
```

---

## Smart Contracts - Flow Testnet

**All 4 contracts live at [0xf8105fdaa45bc140](https://testnet.flowscan.io/account/0xf8105fdaa45bc140)**

| Contract | Purpose |
|----------|---------|
| `FlowPilotRegistry` | Maps vault IDs to IPFS CIDs, tracks total count on-chain |
| `FlowPilotVault` | Stores strategy parameters, manages lifecycle, emits events |
| `FlowPilotFeeCollector` | Applies 15% performance fee on gains, routes to treasury |
| `FlowPilotScheduler` | Creates on-chain rebalance schedules, tracks execution |

---

## Novel Features Built

**Strategy Mutation Engine**
Users update their DeFi strategy by typing plain English. Groq diffs old vs new and presents a side-by-side visual comparison with every changed allocation highlighted before confirming. New version uploaded to IPFS as a versioned update. No other DeFi product offers this.

**Performance Attestation with Conviction Scoring**
AI-verified vault performance record with a 0-100 conviction score minted to IPFS. Permanently verifiable proof-of-yield. A genuinely new DeFi primitive combining AI analysis with onchain storage proofs.

**Vault Health Score**
AI-computed 0-100 health metric on the dashboard. Factors: return progress, pace vs horizon, concentration risk, stability. Groq generates a one-sentence plain-English explanation.

**Multi-Vault Risk Heatmap**
Portfolio view showing capital distribution across strategy types as a live color-coded heat bar with aggregate value and total gain/loss.

**Public Vault Explorer with Conviction Leaderboard**
Live view of all active vaults with conviction scores, allocations, and IPFS links. Real protocol traction visible in real time.

**IPFS Content Verification**
Dashboard Verify IPFS button fetches actual JSON from the stored CID and previews the content inline. Proves the integration is real, not simulated.

**Live Value Ticker**
Dashboard portfolio value updates every 10 seconds with smooth transitions. Autopilot yield accruing visibly in real time.

**Real FCL Browser Transaction**
Vault deployment triggers fcl.authenticate and fcl.mutate calling FlowPilotVault.createVault and FlowPilotRegistry.registerVault on Flow Testnet. Real Flowscan tx hash displayed in activity feed.

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing - NL goal input, how-it-works, tech stack |
| `/confirm` | Strategy review + real FCL browser transaction to Flow |
| `/dashboard` | Live portfolio: health score, AI analysis, ticker, activity feed |
| `/vaults` | Multi-vault portfolio with aggregate view and risk heatmap |
| `/mutate` | Strategy mutation lab with side-by-side visual diff |
| `/attestation` | AI verdict + conviction score minted to IPFS |
| `/explore` | Public vault explorer with conviction leaderboard |

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/parse-intent` | POST | Groq NL to strategy JSON |
| `/api/store-strategy` | POST | Upload to IPFS via NFT.storage |
| `/api/deploy-vault` | POST | Flow REST API vault registration |
| `/api/mutate-strategy` | POST | NL strategy mutation with diff via Groq |
| `/api/mint-attestation` | POST | AI verdict plus conviction score to IPFS |
| `/api/vault-health` | POST | AI-computed 0-100 health score |
| `/api/generate-report` | POST | Groq plain-English performance analysis |
| `/api/send-report` | POST | Weekly HTML email via Resend |
| `/api/schedule-rebalance` | POST | Flow on-chain rebalance scheduling |
| `/api/archive-vault` | POST | Filecoin archival via Lighthouse |
| `/api/get-vault` | GET | Query Flow testnet for live vault count |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 14 App Router | 7 pages, 11 API routes |
| Hosting | Vercel | Free tier, instant deploy |
| Blockchain | Flow Testnet (Cadence) | 4 contracts, FCL browser tx |
| AI | Groq llama-3.3-70b-versatile | Parsing, analysis, mutation, health |
| IPFS | NFT.storage + web3.storage | Real CIDs, Filecoin auto-deals |
| Filecoin | Lighthouse.storage | Free archival tier |
| Database | Supabase PostgreSQL | Vault metadata, email queue |
| Email | Resend | Weekly performance reports |
| Total Budget | $0 | 100% free tier services |

---

## Bounty Alignment

### PL Crypto
- AI-managed portfolio with programmable allocation rules
- Novel financial instrument: NL-defined strategy vault
- Performance attestation with conviction scoring as new DeFi primitive
- Protocol revenue via 15% performance fee (FlowPilotFeeCollector on-chain)
- All strategy objects content-addressed and verifiable on IPFS
- Filecoin archival for completed vault histories

### Flow Blockchain
- 4 Cadence contracts deployed and live on Flow Testnet
- Real FCL browser transaction (fcl.authenticate + fcl.mutate) on vault deployment
- FlowPilotScheduler for native on-chain automation
- Walletless UX - email only, no seed phrases
- Natural language as the primary interface
- Gas-free - protocol-sponsored transaction model

### PL Fresh Code
- Brand new codebase, zero prior deployment
- Real IPFS via NFT.storage with automatic Filecoin deals
- Filecoin archival via Lighthouse for vault histories
- All strategy objects content-addressed and verifiable by CID
- Novel NL-to-Cadence pipeline, first of its kind

---

## Competitive Positioning

| Product | NL Input | Auto-Execute | No Wallet | Flow-Native | Scheduled | AI Mutation | Attestation |
|---------|----------|-------------|-----------|-------------|-----------|-------------|-------------|
| Yearn | No | Yes | No | No | No | No | No |
| Beefy | No | Yes | No | No | No | No | No |
| Acorns | No | Yes | Yes | No | Yes | No | No |
| ChatGPT | Yes | No | Yes | No | No | No | No |
| FlowPilot | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

---

## Revenue Model

| Stream | Mechanism | Status |
|--------|-----------|--------|
| Performance fee | 15% of gains above principal | Live - FlowPilotFeeCollector on-chain |
| Premium tier | $9/month advanced strategies | Planned |
| B2B API | White-label NL vault for fintech | Planned |

Unit economics: 10,000 vaults x $500 avg x 8% return x 15% fee = $60,000/year

---

## Local Development
```bash
git clone https://github.com/Vinaystwt/flowpilot
cd flowpilot
npm install
cp .env.example .env.local
npm run dev
```

### Environment Variables
```
GROQ_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
RESEND_API_KEY=
NFT_STORAGE_TOKEN=
WEB3_STORAGE_TOKEN=
LIGHTHOUSE_API_KEY=
NEXT_PUBLIC_FLOW_NETWORK=testnet
NEXT_PUBLIC_FLOW_ACCESS_NODE=https://rest-testnet.onflow.org
NEXT_PUBLIC_FLOW_DISCOVERY_WALLET=https://fcl-discovery.onflow.org/testnet/authn
FLOW_FEE_PAYER_ADDRESS=0xf8105fdaa45bc140
FLOW_FEE_PAYER_PRIVATE_KEY=
```

---

## Built By

Solo builder. Zero coding background. Built entirely via terminal and AI-assisted development during one hackathon sprint on a $0 budget using 100% free tier services.

---

## License

MIT - PL Genesis: Frontiers of Collaboration Hackathon, March 2026.
