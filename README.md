# Praise Board

A decentralized tipping platform for Ifeoma's public transit timetable site. Commuters connect their wallets, send a small tip with a short note, and immediately see their name appear on a live wall of supporters — sourced directly from on-chain event logs. No platform in the middle, no cut taken.

---

## Deployed Contract

| Field | Value |
|-------|-------|
| **Network** | Ethereum Sepolia Testnet |
| **Contract Address** | `0x4fd78ce671227afc10a7a14ac310f5b05f7760e8` |
| **Etherscan** | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x4fd78ce671227afc10a7a14ac310f5b05f7760e8) |

> ⚡ Update the address above after running `npm run deploy`.

---

## Architecture

```
contracts/
  PraiseBoard.sol          Solidity contract — tip(), withdraw(), Tip event
scripts/
  deploy.ts                Hardhat deploy script → writes deployment.json
frontend/
  app/
    page.tsx               Main page (wallet gate + layout)
    components/
      TipForm.tsx          Send tip + full error handling (rejected, reverted, etc.)
      SupporterWall.tsx    Live wall from decoded event logs + real-time subscription
    config/
      contract.ts          ABI + deployed address
```

### How the Supporter Wall Works

The wall is populated **exclusively from on-chain event logs**:

1. On mount, `getLogs` queries all historical `Tip` events from the contract
2. `useWatchContractEvent` subscribes in real-time — new tips appear the moment they're mined
3. Entries are deduplicated by transaction hash and sorted newest-first
4. No server, no state, no optimistic entries — Ifeoma can trust every entry

---

## Contract

**`PraiseBoard.sol`** — Solidity `^0.8.0`

| Function | Access | Description |
|----------|--------|-------------|
| `tip(string note)` | anyone | Payable. Requires `msg.value > 0` and `bytes(note).length ≤ 280`. Emits `Tip(msg.sender, msg.value, note)`. |
| `withdraw()` | owner only | Zeros `pendingWithdrawal` before transferring (CEI pattern + reentrancy guard). |
| `getBalance()` | view | Returns current ETH balance. |

**Events**

```solidity
event Tip(
    address indexed supporter,  // from msg.sender
    uint256 amount,             // from msg.value
    string note                 // caller's message
);
```

---

## Setup

### Prerequisites

- Node.js 20.12+ (22 LTS recommended)
- MetaMask or another EIP-1193 wallet
- Sepolia testnet ETH (get from [sepoliafaucet.com](https://sepoliafaucet.com))
- A QuickNode Sepolia RPC endpoint

### 1. Install dependencies

```bash
# Root (Hardhat)
npm install

# Frontend
cd frontend && npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
SEPOLIA_RPC_URL=https://sepolia.quicknode.pro/YOUR_ENDPOINT
SEPOLIA_PRIVATE_KEY=0xYOUR_BURNER_WALLET_PRIVATE_KEY
```

> ⚠️ **Never commit `.env`**. It is gitignored. Use a burner wallet for deployment.

### 3. Compile the contract

```bash
npx hardhat compile
```

### 4. Run tests

```bash
npx hardhat test
```

### 5. Deploy to Sepolia

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

After deployment:
- A `deployment.json` file is written with the contract address
- Update `frontend/app/config/contract.ts` with the deployed address
- Update the address in this README

### 6. Run the frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), connect MetaMask on Sepolia, and send a tip!

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Wallet prompt rejected | Distinct "Wallet prompt declined" message (not an error) |
| Transaction reverted on-chain | "Transaction reverted" with receipt status check |
| Wrong network | Banner prompting switch to Sepolia |
| Note > 280 chars | Rejected by both client and contract |
| No funds | `require(msg.value > 0)` in contract |

---

## Security

- **No credentials in tracked files** — all secrets via environment variables
- **CEI pattern** — `pendingWithdrawal` is zeroed before the external call in `withdraw()`
- **Reentrancy guard** — `noReentrancy` modifier on both `tip()` and `withdraw()`
- **Owner-only withdrawal** — `onlyOwner` modifier enforced in the contract
- **Note length** — enforced in the contract, not just the frontend

---

## Tech Stack

- **Smart Contract**: Solidity + Hardhat
- **Frontend**: Next.js 16 + wagmi v3 + viem + RainbowKit
- **Network**: Ethereum Sepolia Testnet
- **RPC**: QuickNode
