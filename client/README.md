# Buyer Client

This client runs locally. It performs the full x402 negotiation explicitly so the demo can show each protocol step, then searches the facilitator's Bazaar index for the resource that was just paid.

```bash
cp .env.example .env
# Set BUYER_RECOVERY_PHRASE and the deployed JOKE_API_URL.
npm ci
npm run dev
```

The buyer key is derived from a BIP-39 recovery phrase using the SEP-0005 path `m/44'/148'/<BUYER_ACCOUNT_INDEX>'`, the same path Freighter, Lobstr and the Stellar Laboratory use. The client prints the derived `G...` address on startup so you can confirm it matches your wallet and fund it.

| Variable | Required | Purpose |
| --- | --- | --- |
| `BUYER_RECOVERY_PHRASE` | yes | 12 or 24 word BIP-39 phrase for the testnet buyer wallet |
| `BUYER_ACCOUNT_INDEX` | no | SEP-0005 account index, defaults to `0` |
| `BUYER_RECOVERY_PASSPHRASE` | no | BIP-39 passphrase ("25th word") if your wallet uses one |

The testnet buyer account needs at least `1000` stroops of XLM for the payment. The facilitator sponsors the network fee. Never deploy or commit `BUYER_RECOVERY_PHRASE`.
