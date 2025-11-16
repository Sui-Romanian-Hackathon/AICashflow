import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const REQUIRED_ADDRESS = "0x2d672f1f05c3f42824609c8e59a1cbca54415aaff33cb2f26a8871a807197eda";

/**
 * Load keypair from environment variables (SUI_MNEMONIC or SUI_PRIVATE_KEY)
 * Validates that the derived address matches the required testnet address
 */
export function loadKeypair(): Ed25519Keypair {
  const mnemonic = process.env.SUI_MNEMONIC;
  const privateKey = process.env.SUI_PRIVATE_KEY;

  if (!mnemonic && !privateKey) {
    throw new Error(
      "No SUI credentials found. Set either SUI_MNEMONIC or SUI_PRIVATE_KEY environment variables."
    );
  }

  let keypair: Ed25519Keypair;

  try {
    if (mnemonic) {
      console.log("[v0] Loading keypair from SUI_MNEMONIC");
      const derivationPath = "m/44'/784'/0'/0'/0'";
      keypair = Ed25519Keypair.deriveKeypair(mnemonic, derivationPath);
      console.log("[v0] Mnemonic parsed successfully with derivation path:", derivationPath);
    } else if (privateKey) {
      console.log("[v0] Loading keypair from SUI_PRIVATE_KEY");
      if (privateKey.startsWith("suiprivkey")) {
        keypair = Ed25519Keypair.fromSecretKey(privateKey);
        console.log("[v0] Private key loaded as Bech32 format");
      } else if (privateKey.length === 128) {
        // Hex format (64 bytes = 128 hex chars)
        keypair = Ed25519Keypair.fromSecretKey(Buffer.from(privateKey, "hex"));
        console.log("[v0] Private key loaded as hex format");
      } else {
        // Try raw format
        keypair = Ed25519Keypair.fromSecretKey(privateKey);
        console.log("[v0] Private key loaded as raw format");
      }
    } else {
      throw new Error("Failed to load keypair");
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[v0] Keypair loading error details:", errorMsg);
    
    if (mnemonic) {
      throw new Error(
        `Failed to parse mnemonic: ${errorMsg}. Ensure SUI_MNEMONIC is a valid 12-word BIP-39 seed phrase.`
      );
    } else {
      throw new Error(
        `Failed to parse private key: ${errorMsg}. Ensure SUI_PRIVATE_KEY is valid (Bech32 format starting with 'suiprivkey' or hex format).`
      );
    }
  }

  const derivedAddress = keypair.getPublicKey().toSuiAddress();
  console.log("[v0] Derived address:", derivedAddress);
  console.log("[v0] Required address:", REQUIRED_ADDRESS);

  if (derivedAddress.toLowerCase() !== REQUIRED_ADDRESS.toLowerCase()) {
    throw new Error(
      `Configured keypair does not match required testnet address. Expected ${REQUIRED_ADDRESS}, got ${derivedAddress}. Please verify your mnemonic or private key is for the correct wallet.`
    );
  }

  return keypair;
}

/**
 * Get the verified signer address (always returns the required testnet address)
 */
export function getSignerAddress(): string {
  return REQUIRED_ADDRESS;
}
