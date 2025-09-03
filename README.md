# MI6Coin

<p align="center">
  <img src="logo/mi6-256.png" width="128" height="128" alt="MI6 Coin logo">
</p>

Non-upgradeable ERC20 with scheduled emissions (10% of current supply) minted to a treasury address.  
Owner controls `mintInterval` (seconds) and can **only raise** the minimum floor via `setMintInterval(newInterval)`.  
`setMintInterval(newInterval)` must satisfy:
```solidity
require(newInterval > minMintInterval, "new min <= current min");
```
Owner can `finalizeMinting()` (one-way) and `burnFromTreasury(amount)`.

---

## Contract addresses

- **Ethereum Mainnet**: `0x75e877014603784eD7B6da4C544147724372f9b2` (verified)
- **Sepolia**: `0xfa2C7a06C30b2B515Fc59D9FD353612C5250648b` (verified)
- **Arbitrum One**: `0x7942c79584CFbD056A9056A5D2B459693E679871` (verified)
- **BNB Chain (BSC)**: `0x3B38DD55c72CFA23A8e269b205f92316CaCD6A3e' (verified)
> If you redeploy, update these values here.

---

## Compiler settings
- Solidity: **0.8.28**
- Optimizer: **enabled**, `runs: 200`

## Constructor
```
MI6Coin(
  string name_,
  string symbol_,
  address treasury_,
  uint256 initialSupply,
  uint256 initialMintInterval
)
```

---

## Install & build
```bash
npm ci   # or: npm i
npx hardhat clean && npx hardhat compile && npx hardhat test
```

> This repository uses **ethers v5** via `@nomiclabs/hardhat-ethers`. Do not switch to ethers v6.

---

## Environment
Copy and edit your `.env` from the template:
```bash
cp .env.example .env
```

Key variables (see `.env.example` for comments):
- `NETWORK` or `RPC_URL`
- `INFURA_KEY` (when using `NETWORK=mainnet|sepolia` without `RPC_URL`)
- `ETHERSCAN_API_KEY`
- `MI6_TREASURY`, `MI6_INITIAL_SUPPLY`, `MI6_MINT_INTERVAL`

---

## Deploy (Ledger, multi-network)
Use the provided script (ethers v5, Ledger signing, automatic EIP-1559/legacy gas):

```bash
# Option A: generic RPC
export RPC_URL="https://rpc.sepolia.org"
# Option B: Infura for Ethereum networks
# export NETWORK=sepolia
# export INFURA_KEY=__YOUR_INFURA_PROJECT_ID__

# Constructor params
export MI6_TREASURY=0xf5D895503b5b6AC08268a86aE86A73C33458C1a8
export MI6_INITIAL_SUPPLY=1000000000000000000000000000
export MI6_MINT_INTERVAL=0

node depMI6Multi.js
```

After tx confirms, the script prints the contract address and a ready-made verify command.

---

## Verify on Etherscan
Sepolia example:
```bash
npx hardhat verify --network sepolia --contract contracts/MI6Coin.sol:MI6Coin   0xYourNewAddress "MI6Coin" "MI6" 0xYourTreasury 1000000000000000000000000000 0
```

---

## Quick test UI (Sepolia)
Serve the static page and interact with the contract via MetaMask:
```bash
# in repo root
python3 -m http.server 8080
# then open:
# http://localhost:8080/indexMI6Sepolia.html
```
Enter the contract address and click **Load**. You can mint (owner only), transfer, burn from treasury (owner), approve, and call `transferFrom` (as spender).

---

## Notes / Safety
- Raising the floor (`setMintInterval(newInterval)`) prevents setting tiny intervals later.
- `finalizeMinting()` permanently disables new emissions.
- Keep your `.env` **out of git**; only `.env.example` lives in the repo.
- Gas token must be present for the **target chain** (ETH on L1/Arbitrum, BNB on BSC, etc.).

---

## Repo layout (key files)
```
contracts/MI6Coin.sol
depMI6Multi.js
indexMI6Sepolia.html
hardhat.config.js
test/MI6Coin.test.js
.env.example
.gitignore
README.md
```

---

## Explorer & Live Demo

- **Etherscan (Mainnet)**: https://etherscan.io/address/0x75e877014603784eD7B6da4C544147724372f9b2#code
- **Etherscan (Sepolia)**: https://sepolia.etherscan.io/address/0xfa2C7a06C30b2B515Fc59D9FD353612C5250648b#code
- **Arbitrum One**: https://arbiscan.io/address/0x7942c79584CFbD056A9056A5D2B459693E679871#code
- **BNB Chain (BSC)**: https://bscscan.com/address/0x3B38DD55c72CFA23A8e269b205f92316CaCD6A3e#code
- **Live test UI (GitHub Pages)**: https://mi6coin.github.io/mi6coin/indexMI6Sepolia.html
  - If the page isn’t live yet, enable Pages: **Settings → Pages → Build and deployment → Deploy from a branch → Branch: `main` → Folder: `/ (root)` → Save**.

---

## Contract spec

**Compiler:** 0.8.24  
**Optimizer:** enabled (runs: 200)  
**Decimals:** 18

### Ethereum Mainnet
- Address: `0x75e877014603784eD7B6da4C544147724372f9b2`
- Creation TX: `0x6b9b8a2c80b1c27957564d659136b6c9494db07af82f6cbd88c08c97bb9c51b4`
- **codehash:** `0x3f0b989f19e46d85bef637a925d3d3d18c371122bb3921e4382e5eebde724219`
- **abi.sha256:** `0xa67f2cfa329a774a9fe0091585bd1c559e3acae837345d03dc66cbaae03af838`

### Sepolia
- Address: `0xfa2C7a06C30b2B515Fc59D9FD353612C5250648b`
- Creation TX: `0x1c8788b135423feb0bf8e1217da4ea2661a52a34296b67dee542dd9bae5fca0a`
- **codehash:** `0xa36475c1c28e4fa9cd3a199baca1691d6a5e983eee588d8d142e85c9e1ca3843`
- **abi.sha256:** `0xa67f2cfa329a774a9fe0091585bd1c559e3acae837345d03dc66cbaae03af838`

### Arbitrum One
- Address: `0x7942c79584CFbD056A9056A5D2B459693E679871`
- Creation TX: `0xebebc5eaa3d6bc1b35459c656f93590969c1b903a8f7c24191b9f77256028960`
- **codehash:** `0xa36475c1c28e4fa9cd3a199baca1691d6a5e983eee588d8d142e85c9e1ca3843`
- **abi.sha256:** `0xa67f2cfa329a774a9fe0091585bd1c559e3acae837345d03dc66cbaae03af838`

### BNB Chain (BSC)
- Address: `0x3B38DD55c72CFA23A8e269b205f92316CaCD6A3e`
- Creation TX: `0x4352258ae012d8a351c6dcf20d931dab23b917d6cda07eabd0796ab920089be9`
- **codehash:** `0x2da40f79df0ae0684676087f718326a85182756cebef00767c457789471a147c`
- **abi.sha256:** `0xa67f2cfa329a774a9fe0091585bd1c559e3acae837345d03dc66cbaae03af838`

