import assert from "node:assert/strict";
import { chooseHandoff, lifecycleRule, marketplaceBucketName, marketplaceRequest } from "./marketplace.ts";

const input = marketplaceRequest.parse({ sellerId: "s", assetKey: "a", buyerId: "b", orderId: "o", buyerUpdate: "approved", payload: "x", ttlDays: 7 });
assert.equal(chooseHandoff(input), "handoff");
assert.deepEqual(lifecycleRule(input.ttlDays), { prefix: "", expire_days: 7 });
assert.equal(chooseHandoff({ ...input, buyerUpdate: " " }), "hold");
const previousBucket = process.env.MARKETPLACE_BUCKET;
process.env.MARKETPLACE_BUCKET = "configured-bucket";
assert.equal(marketplaceBucketName(), "configured-bucket");
if (previousBucket === undefined) delete process.env.MARKETPLACE_BUCKET;
else process.env.MARKETPLACE_BUCKET = previousBucket;
assert.match(marketplaceBucketName(), /^marketplace-throwaways-\d+-[0-9a-f-]{8}$/);
console.log("marketplace decision test passed");
