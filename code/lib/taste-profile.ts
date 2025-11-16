import { NFTMetadata, getNFTsOwnedByAddress } from "./sui-client";
import { normalizeNFTTraits } from "./parsers";

export interface TasteProfile {
  walletAddress: string;
  totalNFTs: number;
  traits: Record<string, number>;
  topTraits: Array<{ trait: string; count: number }>;
}

/**
 * Generate a user's taste profile based on their owned NFTs
 * Step 1: Fetch NFTs and extract traits
 */
export async function generateTasteProfile(
  walletAddress: string
): Promise<TasteProfile> {
  console.log(
    `[v0] Generating taste profile for wallet: ${walletAddress.substring(0, 10)}...`
  );

  // Fetch all NFTs owned by the user
  const nfts = await getNFTsOwnedByAddress(walletAddress);
  console.log(`[v0] Found ${nfts.length} NFTs`);

  // Normalize traits from all NFTs
  const traitCounts: Record<string, number> = {};

  for (const nft of nfts) {
    const normalizedTraits = normalizeNFTTraits(nft);

    // Count occurrences of each trait
    for (const [trait, value] of Object.entries(normalizedTraits)) {
      const traitKey = `${trait}_${value}`;
      traitCounts[traitKey] = (traitCounts[traitKey] || 0) + 1;
    }
  }

  // Get top traits sorted by frequency
  const topTraits = Object.entries(traitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([trait, count]) => ({ trait, count }));

  console.log(
    `[v0] Top traits found:`,
    topTraits.map((t) => `${t.trait}(${t.count})`).join(", ")
  );

  return {
    walletAddress,
    totalNFTs: nfts.length,
    traits: traitCounts,
    topTraits,
  };
}
