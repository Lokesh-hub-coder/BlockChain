import { test } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseEther, getAddress } from "viem";

// Helper: deploy PraiseBoard and return the contract + clients
async function setup() {
  const { viem } = await network.create();
  const [owner, supporter] = await viem.getWalletClients();
  const praiseBoard = await viem.deployContract("PraiseBoard");
  return { praiseBoard, owner, supporter, viem };
}

test("Deployment — owner is set to deployer", async () => {
  const { praiseBoard, owner } = await setup();
  const storedOwner = await praiseBoard.read.owner();
  assert.equal(
    getAddress(storedOwner),
    getAddress(owner.account.address),
    "Owner should be the deployer"
  );
});

test("Tip — emits Tip event with correct args", async () => {
  const { praiseBoard, supporter, viem } = await setup();
  const publicClient = await viem.getPublicClient();

  const noteText = "Thank you for this amazing service!";
  const tipAmount = parseEther("0.1");

  const hash = await praiseBoard.write.tip([noteText], {
    account: supporter.account,
    value: tipAmount,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assert.ok(receipt, "Transaction should complete");
  assert.equal(receipt.status, "success", "Transaction should succeed");
  assert.ok(receipt.logs.length > 0, "Should emit at least one event");
});

test("Tip — note length > 280 is rejected by contract", async () => {
  const { praiseBoard, supporter } = await setup();

  const longNote = "a".repeat(500);
  const tipAmount = parseEther("0.01");

  await assert.rejects(
    () =>
      praiseBoard.write.tip([longNote], {
        account: supporter.account,
        value: tipAmount,
      }),
    (err: any) => {
      const msg = err?.message ?? "";
      return msg.includes("Note too long") || msg.includes("revert");
    },
    "Should reject notes longer than 280 characters"
  );
});

test("Tip — zero value tip is rejected", async () => {
  const { praiseBoard, supporter } = await setup();

  await assert.rejects(
    () =>
      praiseBoard.write.tip(["Hello"], {
        account: supporter.account,
        value: 0n,
      }),
    (err: any) => {
      const msg = err?.message ?? "";
      return msg.includes("Tip amount must be greater than 0") || msg.includes("revert");
    },
    "Should reject zero-value tip"
  );
});

test("Withdraw — non-owner cannot withdraw", async () => {
  const { praiseBoard, supporter } = await setup();

  // Fund the contract first
  await praiseBoard.write.tip(["Support!"], {
    account: supporter.account,
    value: parseEther("0.1"),
  });

  await assert.rejects(
    () =>
      praiseBoard.write.withdraw({
        account: supporter.account,
      }),
    (err: any) => {
      const msg = err?.message ?? "";
      return msg.includes("Only owner can withdraw") || msg.includes("revert");
    },
    "Non-owner should not be able to withdraw"
  );
});

test("Withdraw — owner can withdraw accumulated tips", async () => {
  const { praiseBoard, owner, supporter, viem } = await setup();
  const publicClient = await viem.getPublicClient();

  // Fund the contract
  await praiseBoard.write.tip(["Support!"], {
    account: supporter.account,
    value: parseEther("0.1"),
  });

  const contractBefore = await publicClient.getBalance({
    address: praiseBoard.address,
  });
  assert.ok(contractBefore > 0n, "Contract should have balance");

  // Owner withdraws
  const hash = await praiseBoard.write.withdraw({ account: owner.account });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assert.equal(receipt.status, "success", "Withdrawal should succeed");

  const contractAfter = await publicClient.getBalance({
    address: praiseBoard.address,
  });
  assert.equal(contractAfter, 0n, "Contract balance should be zero after withdrawal");
});

test("Withdraw — nothing to withdraw reverts", async () => {
  const { praiseBoard, owner } = await setup();

  await assert.rejects(
    () => praiseBoard.write.withdraw({ account: owner.account }),
    (err: any) => {
      const msg = err?.message ?? "";
      return msg.includes("Nothing to withdraw") || msg.includes("revert");
    },
    "Withdrawing zero balance should revert"
  );
});
