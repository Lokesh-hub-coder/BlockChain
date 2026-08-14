import "dotenv/config";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL ?? "";
const SEPOLIA_PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY ?? "";

// Build network list — only include sepolia when env vars are populated
const networks: Record<string, any> = {};

if (SEPOLIA_RPC_URL && SEPOLIA_PRIVATE_KEY) {
  // Ensure the key has 0x prefix that Hardhat 3 requires
  const privateKey = SEPOLIA_PRIVATE_KEY.startsWith("0x")
    ? (SEPOLIA_PRIVATE_KEY as `0x${string}`)
    : (`0x${SEPOLIA_PRIVATE_KEY}` as `0x${string}`);

  networks.sepolia = {
    type: "http",
    url: SEPOLIA_RPC_URL,
    accounts: [privateKey],
  };
}

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks,
});
