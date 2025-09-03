# Changelog

## 1.0.1 — 2025-09-03

### Added
- Multi-chain deploy & verify: **mainnet**, **sepolia**, **arbitrumOne**, **bsc**.
- Ledger-based deploy in `scripts/deploy-ledger-mi6.js` (hardware signing; safe fallback to legacy signing if Ledger “resolution” is unavailable).
- Fingerprint task to print `codehash` and `abi.sha256` (Hardhat task `fp` + script `scripts/fingerprint.js`).
- Separate verification config: `hardhat.verify.cjs` (Etherscan V2 / multichain).

### Changed
- Migrated verification to `@nomicfoundation/hardhat-verify` (V2 API).
- Unified CommonJS config `hardhat.config.js`; dedicated config for verify.
- Compiler pinned to **Solidity 0.8.24** (optimizer on, runs: 200).
- Dependencies aligned to **Hardhat v2** + **ethers v5**; enabled `@nomicfoundation/hardhat-chai-matchers`.

### Fixed
- Revert text restored to `"minting finalized"` in `mintNextEmission`.
- Test suite stabilized (**15 passing**) with Hardhat Chai matchers.

### Scripts

```bash
# Build & test
npm run compile
npm test

# Deploy
npm run deploy:mainnet
npm run deploy:sepolia
npm run deploy:arb1
npm run deploy:bsc

# Verify (args: <address> "MI6Coin" "MI6" <treasury> 1000000000000000000000000000 0)
npm run verify:mainnet -- <address> "MI6Coin" "MI6" <treasury> 1000000000000000000000000000 0
npm run verify:sepolia -- <address> "MI6Coin" "MI6" <treasury> 1000000000000000000000000000 0
npm run verify:arb1   -- <address> "MI6Coin" "MI6" <treasury> 1000000000000000000000000000 0
npm run verify:bsc    -- <address> "MI6Coin" "MI6" <treasury> 1000000000000000000000000000 0

# Fingerprints (codehash & abi.sha256)
npm run fp:mainnet
npm run fp:sepolia
npm run fp:arb1
npm run fp:bsc
```

### Addresses & fingerprints

> `codehash` can differ across networks due to metadata; `abi.sha256` is identical.

- Ethereum Mainnet \
Address: `0x75e877014603784eD7B6da4C544147724372f9b2` (verified) \
`codehash`: `0x3f0b989f19e46d85bef637a925d3d3d18c371122bb3921e4382e5eebde724219` \
`abi.sha256`: `0xa67f2cfa329a774a9fe0091585bd1c559e3acae837345d03dc66cbaae03af838`

- Sepolia \
Address: `0xfa2C7a06C30b2B515Fc59D9FD353612C5250648b` (verified) \
`codehash`: `0xa36475c1c28e4fa9cd3a199baca1691d6a5e983eee588d8d142e85c9e1ca3843` \
`abi.sha256`: `0xa67f2cfa329a774a9fe0091585bd1c559e3acae837345d03dc66cbaae03af838`

- Arbitrum One \
Address: `0x7942c79584CFbD056A9056A5D2B459693E679871` (verified) \
`codehash`: `0xa36475c1c28e4fa9cd3a199baca1691d6a5e983eee588d8d142e85c9e1ca3843` \
`abi.sha256`: `0xa67f2cfa329a774a9fe0091585bd1c559e3acae837345d03dc66cbaae03af838`

- BNB Chain (BSC) — canonical \
Address: `0x3B38DD55c72CFA23A8e269b205f92316CaCD6A3e` (verified) \
`codehash`: `0x2da40f79df0ae0684676087f718326a85182756cebef00767c457789471a147c` \
`abi.sha256`: `0xa67f2cfa329a774a9fe0091585bd1c559e3acae837345d03dc66cbaae03af838`

### Environment example
```env
# Multichain Etherscan V2 key (ETH/Arbitrum/BSC/etc)
ETHERSCAN_API_KEY=your_multichain_key

# RPC endpoints
ETH_RPC_URL=https://rpc.ankr.com/eth
SEPOLIA_RPC_URL=https://rpc.sepolia.org
ARB_RPC_URL=https://arb1.arbitrum.io/rpc
BSC_RPC_URL=https://bsc-dataseed.binance.org

# Signers
DEPLOYER_PK=
USE_LEDGER=1
LEDGER_PATH=44'/60'/0'/0/0

# Constructor params
MI6_NAME=MI6Coin
MI6_SYMBOL=MI6
MI6_TREASURY=0xYourTreasuryAddress
MI6_INITIAL_SUPPLY=1000000000000000000000000000
MI6_MINT_INTERVAL=0
```
