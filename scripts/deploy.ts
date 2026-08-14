/**
 * Hardhat 3 deploy script using the viem-based network API.
 * Run: npx hardhat run scripts/deploy.ts --network sepolia
 */
import { network } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log("🚀 Deploying PraiseBoard to Sepolia…\n");

  // Hardhat 3: create a network connection and get the viem helpers
  const { viem } = await network.connect();

  // Get deployer wallet client
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const deployerAddress = deployer.account.address;
  const balance = await publicClient.getBalance({ address: deployerAddress });

  console.log("📝 Deployer :", deployerAddress);
  console.log(
    "💰 Balance  :",
    (Number(balance) / 1e18).toFixed(6),
    "ETH\n"
  );

  if (balance === 0n) {
    throw new Error(
      "Deployer wallet has 0 ETH. Fund it from https://sepoliafaucet.com first."
    );
  }

  // Deploy PraiseBoard
  console.log("⏳ Deploying contract…");
  const praiseBoard = await viem.deployContract("PraiseBoard");

  const contractAddress = praiseBoard.address;
  const owner = await praiseBoard.read.owner();

  console.log("\n" + "=".repeat(60));
  console.log("✅  CONTRACT ADDRESS :", contractAddress);
  console.log("    NETWORK          : Sepolia (chain 11155111)");
  console.log("    OWNER            :", owner);
  console.log("=".repeat(60) + "\n");

  // Write deployment.json (committed to repo so address is publicly visible)
  const info = {
    contractAddress,
    network: "sepolia",
    chainId: 11155111,
    deployer: deployerAddress,
    owner,
    deployedAt: new Date().toISOString(),
  };

  const outPath = join(process.cwd(), "deployment.json");
  writeFileSync(outPath, JSON.stringify(info, null, 2));
  console.log("📄 deployment.json written →", outPath);
  console.log(
    "\n👉 Next: set CONTRACT_ADDRESS in frontend/app/config/contract.ts to",
    contractAddress
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Deploy failed:", err.message ?? err);
    process.exit(1);
  });
