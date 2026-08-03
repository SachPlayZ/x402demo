# openx402 Stellar Joke Demo

A minimal end-to-end x402 demo with two strict boundaries:

```text
api/      Railway-deployed seller API; receives payment at SELLER_PAY_TO
client/   Local buyer; holds BUYER_RECOVERY_PHRASE and is never deployed
```

The paid `GET /joke` route uses the canonical x402 v2 Express and Stellar SDKs with `exact` payment on `stellar:testnet`. It declares official Bazaar metadata through `@openx402/bazaar-sdk`. After a successful payment, the facilitator automatically catalogs the resource and the client confirms that it is searchable.

## What The Demo Proves

1. An unpaid request receives HTTP `402` with Stellar payment requirements.
2. The buyer signs the Stellar authorization locally.
3. The hosted facilitator verifies, sponsors, and settles the transaction.
4. The seller returns the protected joke only after settlement.
5. The client prints the settlement hash and Stellar Expert link.
6. Bazaar receives the seller-declared metadata and returns the API in search.

The payment is `1000` atomic units of testnet native XLM (`0.0001 XLM`). Native XLM avoids faucet and trustline setup for a separate test token. Fee sponsorship is advertised through the standard Stellar `extra.areFeesSponsored` field.

## Deploy The API On Railway

1. Create a new GitHub repository containing this directory and push it.
2. In Railway, choose **New Project > Deploy from GitHub repo** and select it.
3. Railway reads the root `railway.json` and builds `api/Dockerfile`. Do not set a custom start command or root directory. The first boot remains healthy but leaves payments disabled until configuration is complete.
4. Generate a public domain for the service.
5. Add this required variable and redeploy:

   ```env
   SELLER_PAY_TO=G_YOUR_TESTNET_SELLER_PUBLIC_ADDRESS
   ```

6. Optionally override the default facilitator:

   ```env
   FACILITATOR_URL=https://facilitator-production-8430.up.railway.app
   ```

Railway supplies `PORT` and `RAILWAY_PUBLIC_DOMAIN`. The API derives its canonical Bazaar resource URL from that domain. For a custom domain, set `SELLER_PUBLIC_URL=https://api.example.com` and redeploy.

Verify deployment before paying:

```bash
curl https://YOUR_DOMAIN/health
curl -i https://YOUR_DOMAIN/joke
```

The first command must return `200`; the second must return `402`.

## Run The Buyer Locally

The buyer secret belongs only in `client/.env`:

```bash
cd client
cp .env.example .env
```

Fill in:

```env
BUYER_RECOVERY_PHRASE="your twelve or twenty four word testnet recovery phrase"
JOKE_API_URL=https://YOUR_DOMAIN/joke
FACILITATOR_URL=https://facilitator-production-8430.up.railway.app
```

The buyer keypair is derived from the recovery phrase with the SEP-0005 path `m/44'/148'/0'`, matching Freighter, Lobstr and the Stellar Laboratory. Set `BUYER_ACCOUNT_INDEX` to use a different account on the same phrase, and `BUYER_RECOVERY_PASSPHRASE` if your wallet uses a BIP-39 passphrase.

Then run:

```bash
npm ci
npm run dev
```

The client prints the derived buyer address, payment requirements, settlement response, transaction explorer link, protected joke, Bazaar cataloging status, and matching discovery result. It never prints the recovery phrase or the derived secret key.

## Local Development

Install and verify each isolated package:

```bash
cd api
cp .env.example .env
npm ci
npm test
npm run typecheck

cd ../client
cp .env.example .env
npm install
npm run typecheck
```

For a real payment, `SELLER_PUBLIC_URL` must identify the same public endpoint the buyer calls. Deploying to Railway is the simplest supported demo path.

## Security Boundaries

- `SELLER_PAY_TO` is a public `G...` or `C...` address; no seller secret is needed by the API.
- `BUYER_RECOVERY_PHRASE` must remain in the local client environment. It derives the buyer secret in-process; the secret is never written to disk or logged.
- `.env` files are ignored recursively and are excluded from Docker builds.
- The API image copies only `api/`; it cannot contain the client or buyer configuration.
- The facilitator sponsors network fees but never becomes the payment source.
- Bazaar text is seller-authored metadata and should be treated as untrusted by agents.

## License

Apache-2.0. See `LICENSE`.
