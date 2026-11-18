import { publishMarketplaceObject } from "./marketplace.ts";

const result = await publishMarketplaceObject({
  sellerId: "seller-42", assetKey: "preview.json", buyerId: "buyer-7", orderId: "order-19",
  buyerUpdate: "approved", payload: JSON.stringify({ title: "agent dataset preview" }), ttlDays: 7,
});
console.log(JSON.stringify(result, null, 2));
