# Buyer Client

This client runs locally. It performs the full x402 negotiation explicitly so the demo can show each protocol step, then searches the facilitator's Bazaar index for the resource that was just paid.

```bash
cp .env.example .env
# Set BUYER_SECRET_KEY and the deployed JOKE_API_URL.
npm ci
npm run dev
```

The testnet buyer account needs at least `1000` stroops of XLM for the payment. The facilitator sponsors the network fee. Never deploy or commit `BUYER_SECRET_KEY`.
