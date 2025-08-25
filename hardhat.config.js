require("solidity-coverage");

require("@openzeppelin/hardhat-upgrades");
//require("@nomicfoundation/hardhat-ledger");
//require("@nomicfoundation/hardhat-verify");
const INFURA_KEY = process.env.INFURA_KEY || "";

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY,
      mainnet: process.env.ETHERSCAN_API_KEY,
      //arbitrum: process.env.ETHERSCAN_API_KEY
    },
  },
  networks: {
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
      chainId: 1,
      accounts: [], // LedgerSigner будет использоваться вручную
    },
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      chainId: 42161,
      accounts: [],
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
      chainId: 11155111,
      accounts: [],
    }
  }
};

const { LedgerSigner } = require("@ethersproject/hardware-wallets");
const { InfuraProvider } = require("@ethersproject/providers");
