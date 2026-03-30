# FlowPilot

**Your money. On autopilot.**

FlowPilot is a natural-language DeFi portfolio manager built on Flow blockchain.
Tell it your financial goal in plain English. It builds and runs your personalized
strategy automatically — no wallet setup, no gas fees, no complexity.

## How It Works

1. **Tell us your goal** — Type what you want in plain English
2. **We build your strategy** — AI parses your intent into an optimal DeFi allocation
3. **Autopilot takes over** — Cadence smart contracts manage everything automatically
4. **Weekly reports** — Plain-English performance summaries delivered to your inbox

## Features

- **Walletless onboarding** — Email only, no seed phrases
- **Zero gas fees** — Protocol-sponsored transactions, invisible to users
- **Natural language input** — Tell it your goal like you would tell a financial advisor
- **Automated execution** — Flow native scheduled transactions handle rebalancing
- **Verifiable strategies** — Strategy configs stored on IPFS, histories on Filecoin

## Tech Stack

- **Frontend:** Next.js 14, Tailwind CSS, Vercel
- **Blockchain:** Flow (Cadence smart contracts, Account Linking)
- **AI:** Groq (llama-3.3-70b) for intent parsing
- **Storage:** IPFS via web3.storage, Filecoin via Lighthouse
- **Database:** Supabase
- **Email:** Resend

## Smart Contracts

Deployed on Flow Testnet at `0xf8105fdaa45bc140`:
- `FlowPilotRegistry` — Maps users to vault records and IPFS CIDs
- `FlowPilotFeeCollector` — Collects 15% performance fee on gains
- `FlowPilotVault` — Manages strategy parameters and rebalancing logic

## Local Development
```bash
git clone https://github.com/vinaystwt/flowpilot
cd flowpilot
npm install
cp .env.example .env.local
# Add your API keys to .env.local
npm run dev
```

## Architecture

Three-layer system:
- **Intent Layer** — Natural language goal input parsed by Groq LLM
- **Intelligence Layer** — Strategy JSON generated with allocation, thresholds, horizon
- **Execution Layer** — Cadence vault deployed on Flow with native scheduled transactions

## License

MIT
