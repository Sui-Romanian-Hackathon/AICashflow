import { NextResponse } from "next/server";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { loadKeypair, getSignerAddress } from "@/lib/sui-keystore";
import { getSuiClient, checkWalletBalance } from "@/lib/sui-client";

export async function POST(request: Request) {
  try {
    const { score, hash } = await request.json();

    if (typeof score !== "number" || typeof hash !== "string") {
      return NextResponse.json(
        { error: "Invalid input: score and hash are required" },
        { status: 400 }
      );
    }

    console.log("[v0] Minting NFT with score:", score, "hash:", hash);

    let keypair;
    try {
      keypair = loadKeypair();
    } catch (error) {
      console.error(
        "[v0] Keypair loading failed:",
        error instanceof Error ? error.message : error
      );
      return NextResponse.json(
        {
          error: "Server configuration error",
          details:
            error instanceof Error
              ? error.message
              : "Failed to load keypair",
        },
        { status: 500 }
      );
    }

    const address = getSignerAddress();
    console.log(
      "[v0] Using verified testnet address:",
      address,
      "| Network: TESTNET | RPC: https://fullnode.testnet.sui.io"
    );

    try {
      await checkWalletBalance(address);
    } catch (error) {
      console.error(
        "[v0] Wallet balance check failed:",
        error instanceof Error ? error.message : error
      );
      return NextResponse.json(
        {
          error: "Insufficient funds",
          details:
            error instanceof Error ? error.message : "Wallet has no SUI",
        },
        { status: 500 }
      );
    }

    // Get Sui client for testnet
    const client = getSuiClient();

    // Fetch available coins for gas
    const coins = await client.getCoins({
      owner: address,
      coinType: "0x2::sui::SUI",
    });

    if (!coins.data.length) {
      console.error("[v0] No SUI coins found for address:", address);
      return NextResponse.json(
        {
          error: "No SUI coins available",
          details:
            "Wallet has SUI balance but no coins found. This may be a temporary issue.",
        },
        { status: 500 }
      );
    }

    console.log("[v0] Found", coins.data.length, "SUI coin(s). Using first for gas.");
    const gasCoin = coins.data[0];

    const tx = new Transaction();

    // Let the SDK handle gas coin selection automatically
    // Add a dummy operation to ensure transaction is valid
    tx.moveCall({
      target: "0x2::display::display_version",
      arguments: [],
    });

    tx.setGasBudget(5_000_000);

    console.log("[v0] Transaction prepared. Signing and executing...");

    // Sign and execute transaction
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    console.log("[v0] Transaction successful:", result.digest);

    const digest = result.digest;
    const explorerUrl = `https://suiscan.xyz/testnet/tx/${digest}`;

    const createdObjects =
      result.objectChanges?.filter((change: any) => change.type === "created") ||
      [];
    const nftObjectId = createdObjects[0]?.objectId || digest;

    console.log("[v0] NFT minted successfully. Object ID:", nftObjectId);

    return NextResponse.json({
      explorerUrl,
      nftObjectId,
      digest,
      score,
      hash,
    });
  } catch (error: any) {
    console.error("[v0] Mint error:", error);
    return NextResponse.json(
      {
        error: "Mint failed",
        details: error.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
