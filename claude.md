# SSV Network Cluster Debugger

A frontend-only debugging webapp for inspecting SSV Network clusters on the Hoodi public testnet. Built with React + Tailwind CSS. No backend required — all data is fetched directly from the SSV subgraph and on-chain contract calls.

---

## Tech Stack

- **Framework:** React (Vite)
- **Styling:** Tailwind CSS
- **Ethereum interaction:** ethers.js v6 (for contract reads via public RPC)
- **Data sources:**
  - SSV Hoodi Subgraph (GraphQL via The Graph)
  - SSVNetworkViews contract on Hoodi testnet
  - Ethereum block number endpoint

---

## Key Constants

```
BLOCKS_PER_DAY    = 7160
BLOCKS_PER_YEAR   = 7160 * 365 = 2,613,400

SSV_VIEWS_CONTRACT = 0x5AdDb3f1529C5ec70D77400499eE4bbF328368fe
SSV_HOODI_SUBGRAPH = https://api.studio.thegraph.com/query/71118/ssv-network-holesky/version/latest
  (or the correct Hoodi endpoint — verify from https://docs.ssv.network/developers/tools/ssv-subgraph/)

HOODI_RPC = https://ethereum-hoodi-rpc.publicnode.com  (or another public Hoodi RPC)
```

### Cluster Asset Types
- `0` → **ETH** cluster — use the non-SSV variants of view functions
- `1` → **SSV** cluster — use the `*SSV` variants of view functions

---

## Network & Contract Details

### Subgraph

- Docs: https://docs.ssv.network/developers/tools/ssv-subgraph/
- Explorer: https://thegraph.com/explorer/subgraphs/F4AU5vPCuKfHvnLsusibxJEiTN7ELCoYTvnzg3YHGYbh?view=Query&chain=arbitrum-one

**Cluster ID format in subgraph:** `{ownerAddress}-{op1}-{op2}-{op3}-{op4}`
- Owner address **must be lowercase**
- Operator IDs are sorted ascending and joined with `-`

Example query:
```graphql
query ClusterSnapshot {
  cluster(id: "0xe8c927a1fa792eddefe23fda643a62e03f999830-5-6-7-523") {
    validatorCount
    networkFeeIndex
    index
    active
    balance
  }
}
```

### SSVNetworkViews Contract (0x5AdDb3f1529C5ec70D77400499eE4bbF328368fe)

ABI is stored at: `src/abi/SSVNetworkViews.json`

**Cluster tuple (used as input to most view functions):**
```solidity
struct Cluster {
    uint32  validatorCount;
    uint64  networkFeeIndex;
    uint64  index;
    bool    active;
    uint256 balance;
}
```

**Key functions (ETH / SSV variants):**

| Purpose | ETH Cluster | SSV Cluster |
|---|---|---|
| Cluster asset type | `getClusterAssetType(owner, operatorIds)` → uint8 | same (determines which variant to use) |
| Operator info | `getOperatorById(opId)` | `getOperatorByIdSSV(opId)` |
| Operator fee | `getOperatorFee(opId)` | `getOperatorFeeSSV(opId)` |
| Effective balance | `getEffectiveBalance(owner, opIds, cluster)` | N/A — use `validatorCount * 32` |
| Cluster balance | `getBalance(owner, opIds, cluster)` | `getBalanceSSV(owner, opIds, cluster)` |
| Burn rate | `getBurnRate(owner, opIds, cluster)` | `getBurnRateSSV(owner, opIds, cluster)` |
| Liquidatable? | `isLiquidatable(owner, opIds, cluster)` | `isLiquidatableSSV(owner, opIds, cluster)` |
| Liquidated? | `isLiquidated(owner, opIds, cluster)` | `isLiquidatedSSV(owner, opIds, cluster)` |
| Network fee | `getNetworkFee()` | `getNetworkFeeSSV()` |
| Liquidation threshold | `getLiquidationThresholdPeriod()` | `getLiquidationThresholdPeriodSSV()` |
| Min liquidation collateral | `getMinimumLiquidationCollateral()` | `getMinimumLiquidationCollateralSSV()` |

---

## Milestones

### Milestone 1 — Project Setup
- Initialize Vite + React + Tailwind project
- Set up folder structure (`src/abi/`, `src/services/`, `src/components/`, `src/utils/`)
- Place ABI JSON in `src/abi/SSVNetworkViews.json`
- Install ethers.js v6

### Milestone 2 — Subgraph Cluster Fetching
**Input:** Owner address + operator IDs (comma-separated, e.g. `1,2,3,4`)

**Logic:**
1. Lowercase the owner address
2. Sort operator IDs ascending
3. Build subgraph cluster ID: `{owner}-{op1}-{op2}-…`
4. Query the SSV Hoodi subgraph for cluster snapshot fields: `validatorCount`, `networkFeeIndex`, `index`, `active`, `balance`

**Display:**
- Raw JSON output (pretty-printed)
- Single-line array format: `["validatorCount","networkFeeIndex","index","active","balance"]` → `["1","1021238840","1857812400",true,"65604218047000000"]`
- Copy button for the single-line string

**Important:** Owner addresses sent to the subgraph must be **lowercased**.

### Milestone 3 — Contract Data Enrichment
After fetching the subgraph snapshot, use the cluster tuple to call the SSVNetworkViews contract:

1. **Determine asset type:** `getClusterAssetType(owner, operatorIds)` → 0 = ETH, 1 = SSV
2. Based on asset type, call the appropriate variant (ETH or SSV) for:
   - **Operator fees:** For each operator ID, call `getOperatorFee` / `getOperatorFeeSSV` and also `getOperatorById` / `getOperatorByIdSSV`
   - **Effective balance:** `getEffectiveBalance` for ETH; for SSV use `validatorCount * 32`
   - **Cluster balance:** `getBalance` / `getBalanceSSV`
   - **Burn rate:** `getBurnRate` / `getBurnRateSSV`
   - **Liquidation status:** `isLiquidatable` / `isLiquidatableSSV` and `isLiquidated` / `isLiquidatedSSV`

3. **Global network parameters** (no cluster input needed):
   - `getNetworkFee` / `getNetworkFeeSSV` → show raw (per block in wei) + annual (× 2,613,400, converted to ETH)
   - `getLiquidationThresholdPeriod` / `getLiquidationThresholdPeriodSSV` → show raw (blocks) + standardized (÷ 7160 = days)
   - `getMinimumLiquidationCollateral` / `getMinimumLiquidationCollateralSSV` → show raw

### Milestone 4 — Cluster Calculations Dashboard

**Computed values:**

| Metric | Per Block | Per Year |
|---|---|---|
| Operator fees | Σ all operator fees (per block) | × 2,613,400 |
| Network fee | from contract (per block) | × 2,613,400 |
| Burn rate | operator fees + network fee (per block) | × 2,613,400 |

**Liquidation collateral:**
- Fetch `getMinimumLiquidationCollateral` (or SSV variant) → `minCollateral`
- Calculate dynamic collateral:
  - **ETH cluster:** `burnRate(block) × getLiquidationThresholdPeriod × clusterEB / 32`
  - **SSV cluster:** `burnRate(block) × getLiquidationThresholdPeriodSSV × validatorCount`
- **Effective collateral = max(dynamic, minCollateral)**

**Two calculator modes:**

1. **Balance → Runway:**
   - Input: cluster balance (or use fetched balance)
   - Formula: `runway = (balance - liquidationCollateral) / burnRate`
   - Output: runway in blocks, convert to days (÷ 7160)

2. **Runway → Required Balance:**
   - Input: desired runway in blocks (or days)
   - Formula: `requiredBalance = burnRate × runway + liquidationCollateral`
   - Output: required balance in wei and ETH

### Milestone 5 — Liquidation Block & Withdrawal Calculator

1. **Current Ethereum block:** Fetch from Hoodi RPC (`eth_blockNumber`)
2. **Expected liquidation block:**
   - `liquidationBlock = currentBlock + runway` (runway from milestone 4)
   - Display both block number and estimated date
3. **Withdrawal calculator:**
   - Input: "I want to be liquidated in N blocks"
   - Calculate: `maxWithdrawable = currentBalance - (burnRate × N + liquidationCollateral)`
   - Show how much balance can be safely withdrawn

---

## Project Structure

```
ssv-cluster-debugger/
├── public/
├── src/
│   ├── abi/
│   │   └── SSVNetworkViews.json       # Contract ABI
│   ├── components/
│   │   ├── ClusterInput.jsx            # Owner + operator IDs input form
│   │   ├── SubgraphResult.jsx          # Raw + formatted subgraph output
│   │   ├── ContractData.jsx            # On-chain data display
│   │   ├── NetworkParams.jsx           # Global network parameters
│   │   ├── Calculator.jsx              # Runway / balance calculators
│   │   └── LiquidationBlock.jsx        # Block number + withdrawal calc
│   ├── services/
│   │   ├── subgraph.js                 # GraphQL fetch to SSV subgraph
│   │   └── contract.js                 # ethers.js contract reads
│   ├── utils/
│   │   └── format.js                   # Wei/ETH conversion, formatting helpers
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css                       # Tailwind directives
├── tailwind.config.js
├── vite.config.js
├── package.json
└── claude.md
```

---

## Formatting & Display Conventions

- All wei values should be shown in both **raw wei** and **ETH** (÷ 1e18)
- Annual values use `BLOCKS_PER_YEAR = 2,613,400`
- Day conversions use `BLOCKS_PER_DAY = 7,160`
- Operator IDs should always be **sorted ascending** before use
- Owner addresses are always **lowercased** before subgraph queries
- Copy buttons on all key output strings
- Label ETH vs SSV cluster type prominently in the UI
- Show loading states and error messages for all async operations

---

## RPC / Network Notes

- **Network:** Hoodi testnet (Ethereum testnet used by SSV)
- All contract reads are `view` functions — no wallet connection or transactions needed
- Use a public RPC for read-only calls (e.g. `https://ethereum-hoodi-rpc.publicnode.com` or similar)
- The subgraph is queried via standard HTTP POST with GraphQL body
- No API keys should be required for subgraph or public RPC reads

---

## Edge Cases to Handle

- Cluster not found in subgraph (owner/operators combo doesn't exist)
- Operator ID doesn't exist on-chain
- Cluster is already liquidated (`active: false`)
- Zero validator count (burn rate = 0, avoid division by zero in runway calc)
- SSV vs ETH cluster type — always branch on `getClusterAssetType` result
- Very large BigInt values — use ethers.js BigInt formatting, avoid JS Number overflow