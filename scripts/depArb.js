// scripts/depLM10b.js
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const TransportNodeHid = require("@ledgerhq/hw-transport-node-hid").default;
const AppEth = require("@ledgerhq/hw-app-eth").default;
const ledgerService = require("@ledgerhq/hw-app-eth/lib/services/ledger").default;

async function main() {
  // ===== Конфиг сети / RPC =====
  const CHAIN = "arbitrum";
  const CHAIN_ID = 42161;
  const INFURA_KEY = process.env.INFURA_KEY || "adf6858d5cae4aa88f45a34fae7345ce";

  // ===== Ledger =====
  const HD_PATH = process.env.LEDGER_PATH || "44'/60'/0'/0/0";
  const transport = await TransportNodeHid.create();
  const ethApp = new AppEth(transport);
  const { address: ledgerAddress } = await ethApp.getAddress(HD_PATH, false, true);
  console.log("Ledger address:", ledgerAddress);

  const provider = new ethers.providers.InfuraProvider(CHAIN, INFURA_KEY);

  // ===== Параметры конструктора MI6Coin =====
  // При необходимости поправьте значения ниже (или прокиньте через ENV)
  const NAME = process.env.MI6_NAME || "MI6Coin";
  const SYMBOL = process.env.MI6_SYMBOL || "MI6";
  // Treasury: можно указать мультисиг SAFE, если уже создан; по умолчанию — текущий адрес Ledger
  const TREASURY = process.env.MI6_TREASURY || ledgerAddress;

  // ВНИМАНИЕ: initialSupply — в минимальных единицах (18 знаков). Пример: 1_000_000 * 10^18
  const INITIAL_SUPPLY = process.env.MI6_INITIAL_SUPPLY
    ? ethers.BigNumber.from(process.env.MI6_INITIAL_SUPPLY)
    : ethers.utils.parseUnits("1000000", 18); // 1,000,000 MI6

  // Интервал между эмиссиями в секундах (пример: сутки)
  const INITIAL_MINT_INTERVAL = process.env.MI6_MINT_INTERVAL
    ? ethers.BigNumber.from(process.env.MI6_MINT_INTERVAL)
    : ethers.BigNumber.from(86400); // 1 день

  // ===== Загрузка артефакта =====
  // ВАЖНО: путь относительно этого файла (scripts/depLM10b.js)
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "MI6Coin.sol", "MI6Coin.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const abi = artifact.abi;
  const iface = new ethers.utils.Interface(abi);
  const ctor = abi.find((x) => x.type === "constructor") || { inputs: [] };

  // Проверим, что ждём ровно 5 аргументов (как в твоём конструкторе)
  if ((ctor.inputs || []).length !== 5) {
    throw new Error(`Ожидается 5 аргументов конструктора, в ABI найдено: ${(ctor.inputs || []).length}`);
  }

  // Сформируем аргументы конструктора в правильном порядке:
  // constructor(string name_, string symbol_, address treasury_, uint256 initialSupply, uint256 initialMintInterval)
  const ctorArgs = [NAME, SYMBOL, TREASURY, INITIAL_SUPPLY, INITIAL_MINT_INTERVAL];

  // Кодируем байткод + аргументы конструктора
  const encodedCtor = iface.encodeDeploy(ctorArgs);
  const data = artifact.bytecode + encodedCtor.slice(2);

  // ===== Комиссии / газ =====
  const feeData = await provider.getFeeData();
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.utils.parseUnits("1.5", "gwei");
  const maxFeePerGas = feeData.maxFeePerGas || maxPriorityFeePerGas.mul(2);

  const nonce = await provider.getTransactionCount(ledgerAddress);

  let gasLimit;
  try {
    gasLimit = await provider.estimateGas({ from: ledgerAddress, to: null, data });
    gasLimit = gasLimit.mul(120).div(100); // +20% запас
  } catch (e) {
    // fallback, если нода не оценила
    gasLimit = ethers.BigNumber.from("5000000");
  }

  const tx = {
    type: 2,
    chainId: CHAIN_ID,
    nonce,
    to: null,
    value: 0,
    data,
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
  };

  // ===== Подпись Ledger (EIP-1559, y-parity 0/1) =====
  //const unsigned = ethers.utils.serializeTransaction(tx);
  //const sig = await ethApp.signTransaction(HD_PATH, unsigned.slice(2), {});
  const unsigned = ethers.utils.serializeTransaction(tx);
  let sig;
  try {
    // Пытаемся корректно получить resolution (если версия пакета поддерживает)
    const ledgerService = require("@ledgerhq/hw-app-eth/lib/services/ledger").default;
    const resolution = await ledgerService.resolveTransaction(unsigned.slice(2), {
      externalPlugins: true,
      erc20: true,
      nft: false,
    });
    if (!resolution) throw new Error("empty resolution");
    sig = await ethApp.signTransaction(HD_PATH, unsigned.slice(2), resolution);
  } catch (e) {
    console.warn("Ledger resolution недоступен → fallback на legacy подпись:", e.message || e);
    // Надёжный рабочий путь: старая 2-аргументная сигнатура (без resolution)
    sig = await ethApp.signTransaction(HD_PATH, unsigned.slice(2));
  }  const yParity = Number(sig.v) % 2; // 0 или 1

  const signed = ethers.utils.serializeTransaction(tx, {
    v: yParity,
    r: "0x" + sig.r.padStart(64, "0"),
    s: "0x" + sig.s.padStart(64, "0"),
  });

  const resp = await provider.sendTransaction(signed);
  console.log("TX hash:", resp.hash);
  const receipt = await resp.wait();
  console.log("✅ Contract deployed at:", receipt.contractAddress);

  // Небольшая подсказка после деплоя
  console.log("Name:", NAME, "| Symbol:", SYMBOL);
  console.log("Treasury:", TREASURY);
  console.log("InitialSupply (wei):", INITIAL_SUPPLY.toString());
  console.log("MintInterval (sec):", INITIAL_MINT_INTERVAL.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

