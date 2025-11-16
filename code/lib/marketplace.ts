import { NFTMetadata } from "./sui-client";
import { normalizeNFTTraits } from "./parsers";

export interface MarketplaceNFT extends NFTMetadata {
  price?: number;
  listedAt?: string;
}

/**
 * Fetch candidate NFTs from marketplace
 * Step 2: Build candidate pool
 * For this demo, we generate sample marketplace NFTs
 */
export async function fetchCandidateNFTs(
  limit: number = 50
): Promise<MarketplaceNFT[]> {
  console.log(`[v0] Fetching ${limit} candidate NFTs from marketplace`);

  // In production, this would call real marketplace APIs like:
  // - Hyperspace API
  // - Clutchy API
  // - Direct Sui RPC queries for listed objects

  // For demo, generate sample candidates with realistic traits
  const candidates: MarketplaceNFT[] = [];
  const traits = [
    "hat_red",
    "hat_blue",
    "hat_green",
    "eyes_blue",
    "eyes_green",
    "eyes_brown",
    "color_red",
    "color_blue",
    "rarity_rare",
    "rarity_epic",
  ];

  for (let i = 0; i < limit; i++) {
    const selectedTraits = traits
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 3) + 1);

    const nftTraits: Record<string, string> = {};
    selectedTraits.forEach((trait) => {
      nftTraits[trait] = "true";
    });

    candidates.push({
      objectId: `0x${Math.random().toString(16).substring(2)}`,
      name: `Candidate NFT #${i + 1}`,
      collection: ["frens", "capsule", "generic"][
        Math.floor(Math.random() * 3)
      ],
      traits: nftTraits,
      price: Math.random() * 1000 + 10,
      listedAt: new Date().toISOString(),
      description: `Sample marketplace NFT ${i + 1}`,
      imageUrl: `/placeholder.svg?width=200&height=200&query=nft`,
    });
  }

  console.log(`[v0] Generated ${candidates.length} candidate NFTs`);
  return candidates;
}
