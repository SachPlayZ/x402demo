# Joke API

This is the deployable seller service. Railway builds it from `api/Dockerfile`; the local buyer in `../client` is excluded from the image.

The API exposes:

- `GET /health`: public health check.
- `GET /`: public service and payment summary.
- `GET /joke`: x402-protected joke response.

The seller receives `1000` atomic units of testnet native XLM through its Stellar SAC. The facilitator sponsors transaction fees, so the buyer does not need separate fee XLM.

Required production configuration:

```env
SELLER_PAY_TO=G...
FACILITATOR_URL=https://facilitator-production-8430.up.railway.app
```

Railway provides `PORT` and `RAILWAY_PUBLIC_DOMAIN`. Set `SELLER_PUBLIC_URL` only when using a custom domain.

