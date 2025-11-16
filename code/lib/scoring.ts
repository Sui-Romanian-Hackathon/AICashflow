import { TasteProfile } from "./taste-profile";
import { normalizeNFTTraits } from "./parsers";
import { NFTMetadata } from "./sui-client";

export interface ScoredNFT {
  objectId: string;
  name: string;
  collection: string;
  score: number;
  matchedTraits: Array<{ trait: string; value: number }>;
  price?: number;
}

/**
 * Score a candidate NFT based on user's taste profile
 * Step 3: Scoring logic
 */
function scoreCandidate(
  candidate: NFTMetadata,
  tasteProfile: TasteProfile
): ScoredNFT {
  const normalizedTraits = normalizeNFTTraits(candidate);

  let score = 0;
  const matchedTraits: Array<{ trait: string; value: number }> = [];

  // Compare each candidate trait to user's taste profile
  for (const [trait, value] of Object.entries(normalizedTraits)) {
    const traitKey = `${trait}_${value}`;
    const traitCount = tasteProfile.traits[traitKey] || 0;

    if (traitCount > 0) {
      // Weight by frequency in user's collection
      const traitScore = traitCount * 5; // Multiplier for trait importance
      score += traitScore;
      matchedTraits.push({
        trait: traitKey,
        value: traitScore,
      });
    }
  }

  // Bonus for matching multiple traits from top traits
  const topTraitKeys = new Set(tasteProfile.topTraits.map((t) => t.trait));
  const topTraitMatches = matchedTraits.filter((m) =>
    topTraitKeys.has(m.trait)
  ).length;
  score += topTraitMatches * 10; // Bonus for matching top traits

  return {
    objectId: candidate.objectId,
    name: candidate.name || "Unknown",
    collection: candidate.collection || "Unknown",
    score,
    matchedTraits: matchedTraits.sort((a, b) => b.value - a.value),
  };
}

/**
 * Get top recommendations from candidate pool
 */
export async function getRecommendations(
  candidates: NFTMetadata[],
  tasteProfile: TasteProfile,
  topN: number = 5
): Promise<ScoredNFT[]> {
  console.log(
    `[v0] Scoring ${candidates.length} candidates against taste profile`
  );

  // Score all candidates
  const scored = candidates.map((candidate) =>
    scoreCandidate(candidate, tasteProfile)
  );

  // Sort by score and return top N
  const recommendations = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  console.log(
    `[v0] Top recommendations:`,
    recommendations.map((r) => `${r.name}(${r.score})`).join(", ")
  );

  return recommendations;
}
