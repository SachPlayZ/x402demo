import "dotenv/config";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { keypairFromRecoveryPhrase } from "./mnemonic.js";

const NETWORK = "stellar:testnet" as const;
const FACILITATOR_URL = httpUrl(
  process.env.FACILITATOR_URL ?? "https://facilitator-production-8430.up.railway.app",
  "FACILITATOR_URL",
).origin;
const JOKE_API_URL = canonicalResourceUrl(
  httpUrl(required("JOKE_API_URL"), "JOKE_API_URL").toString(),
);
const BUYER_RECOVERY_PHRASE = required("BUYER_RECOVERY_PHRASE");
const BUYER_ACCOUNT_INDEX = accountIndex();

const buyer = keypairFromRecoveryPhrase(
  BUYER_RECOVERY_PHRASE,
  BUYER_ACCOUNT_INDEX,
  process.env.BUYER_RECOVERY_PASSPHRASE ?? "",
);
const signer = createEd25519Signer(buyer.secret(), NETWORK);
const paymentClient = new x402Client().register(NETWORK, new ExactStellarScheme(signer));
const httpClient = new x402HTTPClient(paymentClient);

console.log(`Buyer account m/44'/148'/${BUYER_ACCOUNT_INDEX}' derived from the recovery phrase: ${buyer.publicKey()}`);

console.log(`[1/7] Checking seller API: ${new URL("/health", JOKE_API_URL)}`);
const health = await fetch(new URL("/health", JOKE_API_URL));
if (!health.ok) throw new Error(`seller health check failed with HTTP ${health.status}`);
const { paymentsReady } = await health.json() as { paymentsReady?: boolean };
if (!paymentsReady) {
  throw new Error(
    "seller reports paymentsReady=false, so the paid route is disabled. "
    + "Set SELLER_PAY_TO and SELLER_PUBLIC_URL on the API and redeploy.",
  );
}
console.log(`      Seller is ready on ${NETWORK}.`);

console.log(`[2/7] Requesting ${JOKE_API_URL} without payment.`);
const unpaid = await fetch(JOKE_API_URL);
if (unpaid.status !== 402) {
  const hint = new URL(JOKE_API_URL).pathname === "/"
    ? " JOKE_API_URL must include the paid path, for example https://your-domain/joke."
    : "";
  throw new Error(`expected HTTP 402, received ${unpaid.status}.${hint} ${await unpaid.text()}`);
}
console.log("      Received HTTP 402 Payment Required.");

const requiredPayment = httpClient.getPaymentRequiredResponse(
  name => unpaid.headers.get(name),
  await unpaid.json(),
);
const accepted = requiredPayment.accepts.find(option =>
  option.scheme === "exact" && option.network === NETWORK,
);
if (!accepted) throw new Error("seller did not offer Stellar testnet exact payment");

console.log("[3/7] Accepted payment terms:");
console.log(JSON.stringify({
  scheme: accepted.scheme,
  network: accepted.network,
  asset: accepted.asset,
  amount: accepted.amount,
  payTo: accepted.payTo,
  resource: requiredPayment.resource,
  feesSponsored: accepted.extra?.areFeesSponsored,
}, null, 2));

console.log("[4/7] Signing the Stellar authorization locally. The secret key never leaves this process.");
const payload = await httpClient.createPaymentPayload(requiredPayment);
const paymentHeaders = httpClient.encodePaymentSignatureHeader(payload);

console.log("[5/7] Retrying the joke request with the x402 payment payload.");
const paid = await fetch(JOKE_API_URL, { headers: paymentHeaders });
if (!paid.ok) throw new Error(`paid request failed with HTTP ${paid.status}: ${await paid.text()}`);

const settlement = httpClient.getPaymentSettleResponse(name => paid.headers.get(name));
const extensionResponses = decodeExtensionResponses(paid.headers.get("extension-responses"));
const joke = await paid.json();
const transaction = settlement?.transaction;

console.log("[6/7] Payment settled and the protected response was returned:");
console.log(JSON.stringify({ settlement, cataloging: extensionResponses?.bazaar, joke }, null, 2));
if (transaction) {
  console.log(`      Explorer: https://stellar.expert/explorer/testnet/tx/${transaction}`);
}

console.log("[7/7] Waiting for the paid resource to appear in Bazaar search.");
const discovered = await findInBazaar(JOKE_API_URL);
console.log("      Bazaar found the paid API:");
console.log(JSON.stringify(discovered, null, 2));

async function findInBazaar(resourceUrl: string): Promise<Record<string, unknown>> {
  const search = new URL("/discovery/search", FACILITATOR_URL);
  search.searchParams.set("query", "openx402 joke api humor");
  search.searchParams.set("network", NETWORK);
  search.searchParams.set("limit", "50");

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const response = await fetch(search);
    if (!response.ok) {
      throw new Error(`Bazaar search failed with HTTP ${response.status}: ${await response.text()}`);
    }
    const body = await response.json() as { resources?: Array<Record<string, unknown>> };
    const match = body.resources?.find(resource =>
      typeof resource.resource === "string"
      && canonicalResourceUrl(resource.resource) === canonicalResourceUrl(resourceUrl),
    );
    if (match) return match;
    if (attempt < 10) await sleep(2_000);
  }

  throw new Error(`Bazaar did not return ${resourceUrl} after 20 seconds`);
}

function decodeExtensionResponses(raw: string | null): Record<string, any> | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as Record<string, any>;
  } catch {
    return { decodeError: "EXTENSION-RESPONSES was not valid base64 JSON" };
  }
}

function required(name: "JOKE_API_URL" | "BUYER_RECOVERY_PHRASE"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function accountIndex(): number {
  const raw = process.env.BUYER_ACCOUNT_INDEX?.trim();
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("BUYER_ACCOUNT_INDEX must be a non-negative integer");
  }
  return value;
}

function httpUrl(raw: string, name: string): URL {
  let value: URL;
  try {
    value = new URL(raw);
  } catch {
    throw new Error(`${name} must be an absolute HTTP or HTTPS URL`);
  }
  if (value.protocol !== "http:" && value.protocol !== "https:") {
    throw new Error(`${name} must use HTTP or HTTPS`);
  }
  return value;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function canonicalResourceUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
