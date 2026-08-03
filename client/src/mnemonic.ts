import { mnemonicToSeedSync, validateMnemonic } from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair } from "@stellar/stellar-sdk";

/**
 * Derives a Stellar classic (G) account keypair from a BIP-39 recovery phrase using
 * the SEP-0005 derivation path `m/44'/148'/<accountIndex>'`. This is the same path
 * used by Freighter, Lobstr and the Stellar Laboratory, so a phrase exported from
 * any of them resolves to the same account here.
 *
 * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0005.md
 */
export function keypairFromRecoveryPhrase(
  phrase: string,
  accountIndex = 0,
  passphrase = "",
): Keypair {
  const mnemonic = normalizeMnemonic(phrase);
  if (!validateMnemonic(mnemonic)) {
    throw new Error("BUYER_RECOVERY_PHRASE is not a valid BIP-39 recovery phrase");
  }
  if (!Number.isInteger(accountIndex) || accountIndex < 0) {
    throw new Error("BUYER_ACCOUNT_INDEX must be a non-negative integer");
  }

  const seed = mnemonicToSeedSync(mnemonic, passphrase);
  const { key } = derivePath(`m/44'/148'/${accountIndex}'`, seed.toString("hex"));
  return Keypair.fromRawEd25519Seed(Buffer.from(key));
}

/** Collapses casing and whitespace so a pasted phrase still validates. */
function normalizeMnemonic(phrase: string): string {
  return phrase.normalize("NFKD").trim().toLowerCase().split(/\s+/).join(" ");
}
