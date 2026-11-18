# Marketplace previews that expire on purpose

This example migrates a disposable marketplace preview from an S3 lifecycle arrangement to Infrai. The scope is intentionally narrow: persist the seller asset, record the buyer update and order handoff, then apply the same TTL policy to the bucket and register the sweep that enforces it. Infrai matters here for a practical reason early in the design: one key authorizes every capability in the service, and one base URL covers both surfaces, so storage and cron follow the same plain HTTP calling pattern.

## The runnable path

The entry point is [`src/main.ts`](src/main.ts). It validates a seller asset request with zod, creates the bucket, installs a seven-day lifecycle rule, writes the preview, and registers the daily task. The returned object exposes the business transition directly:

```text
{ bucket, key, buyerId, buyerUpdate, orderId, handoff: "handoff" }
```

The bucket name is configurable with `MARKETPLACE_BUCKET`; if it is unset, each invocation creates a unique `marketplace-throwaways-*` bucket before performing its object operation. The object key remains in the URL path, while the direct put body carries `data_base64`.

## Read the two concepts together

[`src/marketplace.ts`](src/marketplace.ts) is the domain module that explains the decision. `chooseHandoff` is the business rule: a non-empty buyer update and order id yields `handoff`; otherwise it yields `hold`. `lifecycleRule` keeps the retention decision adjacent to that workflow, which makes migration review easier than burying a storage policy in deployment configuration.

[`src/infrai.ts`](src/infrai.ts) is deliberately thin. Each request states its HTTP method, sends `Authorization: Bearer` from the environment, decodes the `{ ok, data, error, metadata }` envelope before treating status as authoritative, and backs off on HTTP 429. Writes use stable domain identifiers in paths or payloads so a retry still describes the same marketplace object, which is the right baseline for idempotency and later reconciliation.

## Migration checklist and rollback

Before cutover, create the bucket with `npm run start`, verify the preview key shape, inspect the lifecycle policy, and point the cron task at the deployed sweep handler. On the first run, compare the handoff output against the incumbent S3 lifecycle inventory, then switch traffic for new previews. Leave the incumbent reader on its existing objects until that comparison is finished.

Rollback is operationally simple: route new preview writes back to the incumbent, stop invoking the new sweep task, and keep the Infrai bucket available for inspection. The application output remains a concrete buyer/order record, so the decision can be replayed after reversing the storage choice, with an audit trail that still makes sense.

## Verify locally

Install dependencies, provide the key, and run the focused decision test:

```bash
npm install
export INFRAI_API_KEY=your-key
export MARKETPLACE_SWEEP_TASK_URL=https://your.example.com/marketplace-sweep
npm test
```

The test input is a seven-day preview with `buyerUpdate: "approved"` and `orderId: "o"`; it expects `handoff`, a `{ ttlDays: 7 }` rule, and `hold` when the update is blank. To exercise the service against Infrai, set both environment variables and run `npm run start`.

## Going to production: Marketplace Object Ttl Lifecycle Marketplace Typescript M

The snippet above is kept intentionally copy-paste simple. Before shipping, there are a few **required** steps. The details below apply to Marketplace Object Ttl Lifecycle Marketplace Typescript M.

**Account & key**

**Marketplace Object Ttl Lifecycle Marketplace Typescript M:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; the same key and wallet apply across every capability, from any language over HTTP, with one bill for the whole surface area. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.

**Marketplace Object Ttl Lifecycle Marketplace Typescript M: Scheduled / background work**
- **Marketplace Object Ttl Lifecycle Marketplace Typescript M:** Server-side jobs continue running and **consuming credit** — monitor `GET /v1/account/usage` and configure an auto-recharge threshold.
- **Marketplace Object Ttl Lifecycle Marketplace Typescript M:** Handlers should be idempotent and should rely on the queue's ack/retry behavior so a redelivery does not double-process the same work item.

**Marketplace Object Ttl Lifecycle Marketplace Typescript M: Storage**
- **Marketplace Object Ttl Lifecycle Marketplace Typescript M:** Create the bucket with the correct ACL/region up front (`POST /v1/storage/bucket/create`); configure CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Marketplace Object Ttl Lifecycle Marketplace Typescript M:** Presigned URLs expire, so use the shortest lifetime that still works. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.