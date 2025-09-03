// scripts/depMI6Multi.js
// Deploy MI6Coin (from contracts/MI6Coin2.sol) using a Ledger hardware wallet (ethers v5),
// with automatic network detection and EIP-1559 vs legacy gas handling.
//
// Usage (bash):
//   # Choose one:
//   export RPC_URL="https://arb1.arbitrum.io/rpc"        # any EVM RPC (Arbitrum, BNB, etc.)
//   # OR use Infura for Ethereum networks:
//   export NETWORK=sepolia
//   export INFURA_KEY=__YOUR_INFURA_PROJECT_ID__
//
//   # Constructor params (ENV or defaults below):
//   export MI6_NAME="MI6 Coin"
//   export MI6_SYMBOL="MI6"
//   export MI6_TREASURY=0x...                            # optional; defaults to Ledger address
//   export MI6_INITIAL_SUPPLY=1000000000000000000000000000
//   export MI6_MINT_INTERVAL=60
//
//   # Optional: override artifact location if file is renamed/moved
//   export CONTRACT_PATH="contracts/MI6Coin2.sol:MI6Coin"
//
//   node scripts/depMI6Multi.js
//
// Notes:
// - No secrets are hardcoded. All values come from env.
// - Works on Ethereum, Arbitrum, BNB Chain, etc. (any EVM RPC).
// - Uses legacy gas on chains without EIP-1559 (e.g., BNB), and EIP-1559 where available.
// - Requires: ethers@5, @ledgerhq/hw-transport-node-hid, @ledgerhq/hw-app-eth.

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const TransportNodeHid = require("@ledgerhq/hw-transport-node-hid").default;
const AppEth = require("@ledgerhq/hw-app-eth").default;

function artifactFromSpecifier(spec) {
  // spec format: "contracts/MI6Coin2.sol:MI6Coin"
  // artifacts path: artifacts/contracts/MI6Coin2.sol/MI6Coin.json
  const [file, contract] = spec.split(":");
  if (!file || !contract) {
    throw new Error(`Invalid CONTRACT_PATH "${spec}". Expected "contracts/FILE.sol:ContractName"`);
  }
  const jsonPath = path.join(__dirname, "..", "artifacts", file, `${contract}.json`);
  return { jsonPath, contract };
}

async function makeProvider() {
  const RPC_URL = process.env.RPC_URL;
  if (RPC_URL) {
    return new ethers.providers.JsonRpcProvider(RPC_URL);
  }
  const INFURA_KEY = process.env.INFURA_KEY;
  if (!INFURA_KEY) {
    throw new Error("Missing INFURA_KEY (or provide RPC_URL)");
  }
  return new ethers.providers.InfuraProvider(NETWORK, INFURA_KEY);
}

async function main() {
  // ===== Provider & network =====
  const provider = await makeProvider();
  const net = await provider.getNetwork();
  const chainId = net.chainId;
  console.log(`Network: ${net.name || "unknown"} (chainId ${chainId})`);

  // ===== Ledger =====
  const HD_PATH = process.env.LEDGER_PATH || "44'/60'/0'/0/0";
  const transport = await TransportNodeHid.create();
  const ethApp = new AppEth(transport);
  const { address: ledgerAddress } = await ethApp.getAddress(HD_PATH, false, true);
  console.log("Ledger address:", ledgerAddress);

  // ===== Constructor params =====
  const NAME = process.env.MI6_NAME ?? "MI6 Coin";
  const SYMBOL = process.env.MI6_SYMBOL || "MI6";
  const TREASURY = process.env.MI6_TREASURY || ledgerAddress;
  const INITIAL_SUPPLY = process.env.MI6_INITIAL_SUPPLY
    ? ethers.BigNumber.from(process.env.MI6_INITIAL_SUPPLY)
    : ethers.utils.parseUnits("1000000", 18);
  const MINT_INTERVAL = process.env.MI6_MINT_INTERVAL
    ? ethers.BigNumber.from(process.env.MI6_MINT_INTERVAL)
    : ethers.BigNumber.from("60");

  // ===== Load artifact =====
  const SPEC = process.env.CONTRACT_PATH || "contracts/MI6Coin.sol:MI6Coin";
  const { jsonPath, contract } = artifactFromSpecifier(SPEC);
  const artifact = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const abi = artifact.abi;
  const iface = new ethers.utils.Interface(abi);
  const ctor = abi.find((x) => x.type === "constructor") || { inputs: [] };
  if ((ctor.inputs || []).length !== 5) {
    throw new Error(`Constructor expects 5 args; ABI has: ${(ctor.inputs || []).length}`);
  }

  const ctorArgs = [NAME, SYMBOL, TREASURY, INITIAL_SUPPLY, MINT_INTERVAL];
  const encodedCtor = iface.encodeDeploy(ctorArgs);
  const data = artifact.bytecode + encodedCtor.slice(2);

  // ===== Fees / gas & tx shape (EIP-1559 vs legacy) =====
  const fee = await provider.getFeeData();
  const nonce = await provider.getTransactionCount(ledgerAddress);

  // Gas limit estimation for contract creation
  let gasLimit;
  try {
    gasLimit = await provider.estimateGas({ from: ledgerAddress, to: null, data });
    gasLimit = gasLimit.mul(120).div(100); // +20% buffer
  } catch (_) {
    gasLimit = ethers.BigNumber.from("5000000");
  }

  // Decide legacy vs EIP-1559
  const FORCE_LEGACY = [56, 97];                  // BSC main/test
  const PREFER_LEGACY = [42161, 42170];           // Arbitrum One / Nova (heuristic)
  const useLegacy =
    FORCE_LEGACY.includes(chainId) ||
    !fee.maxFeePerGas ||
    fee.maxFeePerGas.eq(0) ||
    PREFER_LEGACY.includes(chainId);

  const base = { chainId, nonce, to: null, value: 0, data, gasLimit };

  let tx;
  if (useLegacy) {
    const gasPrice = fee.gasPrice || (await provider.getGasPrice());
    tx = { ...base, gasPrice };                   // type 0
    console.log("Using LEGACY gas with gasPrice =", gasPrice.toString());
  } else {
    const maxPriority = fee.maxPriorityFeePerGas || ethers.utils.parseUnits("1.5", "gwei");
    const maxFee = fee.maxFeePerGas || maxPriority.mul(2);
    tx = { ...base, type: 2, maxPriorityFeePerGas: maxPriority, maxFeePerGas: maxFee };
    console.log("Using EIP-1559 gas with maxFeePerGas =", maxFee.toString(),
                "maxPriorityFeePerGas =", maxPriority.toString());
  }

  // ===== Ledger signing (try resolution; fallback to legacy method) =====
  const unsigned = ethers.utils.serializeTransaction(tx);
  let sig;
  try {
    const ledgerService = require("@ledgerhq/hw-app-eth/lib/services/ledger").default;
    const resolution = await ledgerService.resolveTransaction(unsigned.slice(2), {
      externalPlugins: true,
      erc20: true,
      nft: false,
    });
    if (!resolution) throw new Error("empty resolution");
    sig = await ethApp.signTransaction(HD_PATH, unsigned.slice(2), resolution);
  } catch (e) {
    console.warn("Ledger resolution unavailable → falling back to legacy signature:", e.message || e);
    sig = await ethApp.signTransaction(HD_PATH, unsigned.slice(2));
  }
  const yParity = Number(sig.v) % 2;
  const signed = ethers.utils.serializeTransaction(tx, {
    v: yParity,
    r: "0x" + String(sig.r).padStart(64, "0"),
    s: "0x" + String(sig.s).padStart(64, "0"),
  });

  // ===== Send =====
  const resp = await provider.sendTransaction(signed);
  console.log("TX hash:", resp.hash);
  const receipt = await resp.wait();
  console.log("✅ Contract deployed at:", receipt.contractAddress);

  console.log("Name:", NAME, "| Symbol:", SYMBOL);
  console.log("Treasury:", TREASURY);
  console.log("InitialSupply (wei):", INITIAL_SUPPLY.toString());
  console.log("MintInterval (sec):", MINT_INTERVAL.toString());

  console.log("\nVerify example (adjust explorer/network):");
  // --- Detect network by RPC and compare with NETWORK_ENV ---
  const NETWORK_ENV = process.env.NETWORK; // optional
  const detected = await provider.getNetwork();
  const id = detected.chainId;
  const byId = { 1: "mainnet", 11155111: "sepolia", 42161: "arbitrumOne", 56: "bsc" };
  const detectedName = byId[id] || `chain-${id}`;
  if (NETWORK_ENV && NETWORK_ENV !== detectedName) {
    throw new Error(`NETWORK=${NETWORK_ENV} не совпадает с RPC chainId=${id} (${detectedName}). Проверь RPC_URL/NETWORK.`);
  }
  const VERIFY_NET = NETWORK_ENV || detectedName;
  console.log(`npx hardhat verify --network ${VERIFY_NET} --contract ${SPEC} \\`);
  //console.log(`npx hardhat verify --network ${process.env.NETWORK || "sepolia"} --contract ${SPEC} \\`);
  console.log(`  ${receipt.contractAddress} "${NAME}" "${SYMBOL}" ${TREASURY} ${INITIAL_SUPPLY.toString()} ${MINT_INTERVAL.toString()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
