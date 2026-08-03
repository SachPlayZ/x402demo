import "dotenv/config";
import { randomInt } from "node:crypto";
import express from "express";
import { bazaar } from "@openx402/bazaar-sdk";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { jokeAt, jokes } from "./jokes.js";

const NETWORK = "stellar:testnet" as const;
const XLM_SAC = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const PRICE_ATOMIC = "1000";
const PORT = parsePort(process.env.PORT);
const FACILITATOR_URL = parseHttpUrl(
  process.env.FACILITATOR_URL ?? "https://facilitator-production-8430.up.railway.app",
  "FACILITATOR_URL",
).origin;
const PUBLIC_ORIGIN = resolvePublicOrigin();
const JOKE_URL = PUBLIC_ORIGIN ? new URL("/joke", PUBLIC_ORIGIN).toString() : undefined;
const PAY_TO = parseSellerAddress(process.env.SELLER_PAY_TO);

const metadata = bazaar.http({
  description: "Returns one short, family-friendly joke for a person or AI agent.",
  serviceName: "openx402 Joke API",
  tags: ["jokes", "humor", "developer", "agents"],
  method: "GET",
  output: {
    type: "json",
    description: "A joke identifier, category, text, and generation timestamp.",
    example: {
      id: "stellar-01",
      category: "stellar",
      joke: "Why did the payment cross the ledger? To reach finality on the other side.",
      servedAt: "2026-08-03T12:00:00.000Z",
    },
  },
});

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.get("/health", (_request, response) => {
  response.json({ status: "ok", network: NETWORK, paymentsReady: Boolean(JOKE_URL && PAY_TO) });
});

app.get("/", (_request, response) => {
  response.json({
    service: "openx402 Joke API",
    paidEndpoint: JOKE_URL ?? null,
    network: NETWORK,
    scheme: "exact",
    asset: XLM_SAC,
    amount: PRICE_ATOMIC,
    feesSponsored: true,
  });
});

if (JOKE_URL && PAY_TO) {
  const facilitator = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
  const resourceServer = new x402ResourceServer(facilitator)
    .register(NETWORK, new ExactStellarScheme());

  app.use(paymentMiddleware({
    "GET /joke": {
      accepts: [{
        scheme: "exact",
        network: NETWORK,
        price: { asset: XLM_SAC, amount: PRICE_ATOMIC },
        payTo: PAY_TO,
        maxTimeoutSeconds: 60,
        extra: { areFeesSponsored: true },
      }],
      resource: JOKE_URL,
      description: metadata.resource.description,
      serviceName: metadata.resource.serviceName,
      tags: metadata.resource.tags,
      mimeType: "application/json",
      extensions: metadata.extensions,
    },
  }, resourceServer));

  app.get("/joke", (_request, response) => {
    const selected = jokeAt(randomInt(jokes.length));
    response.set("cache-control", "no-store");
    response.json({
      id: selected.id,
      category: selected.category,
      joke: selected.text,
      servedAt: new Date().toISOString(),
    });
  });
} else {
  app.get("/joke", (_request, response) => {
    response.status(503).json({
      error: "payment route is not configured",
      missing: [
        ...(!PAY_TO ? ["SELLER_PAY_TO"] : []),
        ...(!JOKE_URL ? ["Railway public domain or SELLER_PUBLIC_URL"] : []),
      ],
    });
  });
}

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(JSON.stringify({
    status: "listening",
    port: PORT,
    resource: JOKE_URL ?? null,
    paymentsReady: Boolean(JOKE_URL && PAY_TO),
    facilitator: FACILITATOR_URL,
    network: NETWORK,
    scheme: "exact",
    payTo: PAY_TO ?? null,
    asset: XLM_SAC,
    amount: PRICE_ATOMIC,
  }));
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(error => {
      if (error) {
        console.error(error);
        process.exitCode = 1;
      }
    });
  });
}

function parsePort(raw: string | undefined): number {
  const port = Number(raw ?? "4788");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
}

function parseHttpUrl(raw: string, name: string): URL {
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

function resolvePublicOrigin(): string | undefined {
  const configured = process.env.SELLER_PUBLIC_URL?.trim();
  if (configured) return parseHttpUrl(configured, "SELLER_PUBLIC_URL").origin;

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayDomain) return parseHttpUrl(`https://${railwayDomain}`, "RAILWAY_PUBLIC_DOMAIN").origin;

  if (process.env.NODE_ENV !== "production") return `http://127.0.0.1:${PORT}`;
  return undefined;
}

function parseSellerAddress(raw: string | undefined): string | undefined {
  const address = raw?.trim();
  if (!address) return undefined;
  if (!/^[GC][A-Z2-7]{55}$/.test(address)) {
    throw new Error("SELLER_PAY_TO must be a valid Stellar G... or C... public address");
  }
  return address;
}
