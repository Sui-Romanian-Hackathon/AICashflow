import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

let suiClient: SuiClient | null = null;

export function getSuiClient(): SuiClient {
  if (!suiClient) {
    suiClient = new SuiClient({
      url: getFullnodeUrl("testnet"),
    });
    console.log("[v0] Sui client initialized for TESTNET");
  }
  return suiClient;
}

/**
 * Check wallet balance before transactions
 */
export async function checkWalletBalance(address: string): Promise<string> {
  const client = getSuiClient();
  const balance = await client.getBalance({
    owner: address,
    coinType: "0x2::sui::SUI",
  });

  const suiAmount = Number(balance.totalBalance) / 1_000_000_000;
  console.log("[v0] Wallet balance:", suiAmount, "SUI");

  if (suiAmount === 0) {
    throw new Error(
      `Wallet has 0 SUI on TESTNET. Please fund it at https://faucet.sui.io`
    );
  }

  return balance.totalBalance;
}

export interface NFTMetadata {
  objectId: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  collection?: string;
  traits: Record<string, string>;
}

export async function getNFTsOwnedByAddress(
  walletAddress: string
): Promise<NFTMetadata[]> {
  const client = getSuiClient();

  try {
    const objects = await client.getOwnedObjects({
      owner: walletAddress,
      options: {
        showContent: true,
        showType: true,
      },
    });

    const nfts: NFTMetadata[] = [];

    for (const obj of objects.data) {
      if (obj.data?.content?.dataType === "moveObject") {
        const type = obj.data.type || "";
        // Filter for NFT-like objects (typically have display fields)
        if (
          type.includes("NFT") ||
          type.includes("nft") ||
          type.includes("0x")
        ) {
          const content = obj.data.content as Record<string, unknown>;
          nfts.push({
            objectId: obj.data.objectId,
            name: (content.fields as Record<string, unknown>)?.name as string,
            description: (content.fields as Record<string, unknown>)
              ?.description as string,
            imageUrl: (content.fields as Record<string, unknown>)?.image_url as string,
            collection: type,
            traits: {},
          });
        }
      }
    }

    return nfts;
  } catch (error) {
    console.error("[v0] Error fetching NFTs:", error);
    throw new Error("Failed to fetch NFTs from wallet");
  }
}
