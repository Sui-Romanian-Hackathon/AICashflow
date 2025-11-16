import { NextRequest, NextResponse } from "next/server";
import { generateTasteProfile } from "@/lib/taste-profile";
import { fetchCandidateNFTs } from "@/lib/marketplace";
import { getRecommendations } from "@/lib/scoring";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    // Validate input
    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    console.log(
      `[v0] Recommendation request for wallet: ${walletAddress.substring(0, 10)}...`
    );

    // Step 1: Generate user's taste profile
    const tasteProfile = await generateTasteProfile(walletAddress);

    if (tasteProfile.totalNFTs === 0) {
      return NextResponse.json(
        {
          error: "Wallet has no NFTs. Cannot generate recommendations.",
          walletAddress,
        },
        { status: 400 }
      );
    }

    // Step 2: Fetch candidate NFTs from marketplace
    const candidates = await fetchCandidateNFTs(50);

    // Step 3: Score and get recommendations
    const recommendations = await getRecommendations(
      candidates,
      tasteProfile,
      5
    );

    console.log(
      `[v0] Successfully generated ${recommendations.length} recommendations`
    );

    return NextResponse.json({
      success: true,
      walletAddress,
      tasteProfile: {
        totalNFTs: tasteProfile.totalNFTs,
        topTraits: tasteProfile.topTraits,
      },
      recommendations,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[v0] Recommendation error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate recommendations";

    return NextResponse.json(
      {
        error: errorMessage,
        details: "Check wallet address and try again",
      },
      { status: 500 }
    );
  }
}
