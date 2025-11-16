import { NFTMetadata } from "./sui-client";

// Collection-specific trait parsers
const collectionParsers: Record<
  string,
  (data: Record<string, unknown>) => Record<string, string>
> = {
  frens: parseFrensTraits,
  capsule: parseCapsulesTraits,
  default: parseDefaultTraits,
};

/**
 * Parse Frens NFT traits (example collection)
 * Converts metadata to normalized trait format
 */
function parseFrensTraits(
  data: Record<string, unknown>
): Record<string, string> {
  const traits: Record<string, string> = {};

  if (data.name) {
    traits["name"] = String(data.name).toLowerCase();
  }

  // Example: Extract hat color from name or attributes
  const name = String(data.name || "").toLowerCase();
  if (name.includes("red hat")) traits["hat_red"] = "true";
  if (name.includes("blue hat")) traits["hat_blue"] = "true";
  if (name.includes("green hat")) traits["hat_green"] = "true";

  // Extract eyes color
  if (name.includes("blue eyes")) traits["eyes_blue"] = "true";
  if (name.includes("green eyes")) traits["eyes_green"] = "true";
  if (name.includes("brown eyes")) traits["eyes_brown"] = "true";

  return traits;
}

/**
 * Parse Capsule NFT traits (example collection)
 */
function parseCapsulesTraits(
  data: Record<string, unknown>
): Record<string, string> {
  const traits: Record<string, string> = {};

  if (data.rarity) {
    traits["rarity"] = String(data.rarity).toLowerCase();
  }

  if (data.color) {
    traits[`color_${String(data.color).toLowerCase()}`] = "true";
  }

  if (data.shape) {
    traits[`shape_${String(data.shape).toLowerCase()}`] = "true";
  }

  return traits;
}

/**
 * Default trait parser for unknown collections
 */
function parseDefaultTraits(
  data: Record<string, unknown>
): Record<string, string> {
  const traits: Record<string, string> = {};

  // Extract basic metadata
  Object.entries(data).forEach(([key, value]) => {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      const normalizedKey = key.toLowerCase().replace(/\s+/g, "_");
      traits[normalizedKey] = String(value).toLowerCase();
    }
  });

  return traits;
}

/**
 * Normalize NFT metadata to trait format based on collection
 */
export function normalizeNFTTraits(nft: NFTMetadata): Record<string, string> {
  // Determine collection type
  const collectionKey = nft.collection?.toLowerCase() || "default";

  // Select parser (default to 'default' parser if collection not found)
  const parser = Object.keys(collectionParsers).some((key) =>
    collectionKey.includes(key)
  )
    ? collectionParsers[
        Object.keys(collectionParsers).find((key) =>
          collectionKey.includes(key)
        ) || "default"
      ]
    : collectionParsers.default;

  const metadata = {
    name: nft.name,
    description: nft.description,
    imageUrl: nft.imageUrl,
    ...nft.traits,
  } as Record<string, unknown>;

  return parser(metadata);
}
