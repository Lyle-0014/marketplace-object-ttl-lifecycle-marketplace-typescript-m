import { z } from "zod";
import { randomUUID } from "node:crypto";
import { infrai } from "./infrai.ts";

export const marketplaceRequest = z.object({
  sellerId: z.string().min(1), assetKey: z.string().min(1), buyerId: z.string().min(1), orderId: z.string().min(1),
  buyerUpdate: z.string().min(1), payload: z.string().min(1), ttlDays: z.number().int().positive(),
});
export type MarketplaceRequest = z.infer<typeof marketplaceRequest>;

export function lifecycleRule(ttlDays: number): Record<string, unknown> {
  return { prefix: "", expire_days: ttlDays };
}

export function chooseHandoff(input: MarketplaceRequest): "handoff" | "hold" {
  return input.buyerUpdate.trim().length > 0 && input.orderId.trim().length > 0 ? "handoff" : "hold";
}

export function marketplaceBucketName(): string {
  return process.env.MARKETPLACE_BUCKET ?? `marketplace-throwaways-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

function marketplaceSweepTask(): string {
  const task = process.env.MARKETPLACE_SWEEP_TASK_URL;
  if (!task) throw new Error("MARKETPLACE_SWEEP_TASK_URL is required");
  return task;
}

export async function publishMarketplaceObject(input: MarketplaceRequest) {
  const parsed = marketplaceRequest.parse(input);
  const generatedBucket = process.env.MARKETPLACE_BUCKET === undefined;
  const bucket = marketplaceBucketName();
  const key = `seller/${parsed.sellerId}/${parsed.assetKey}`;
  let objectCreated = false;
  try {
    await infrai.storage.bucket.create({ name: bucket });
    await infrai.storage.bucket.set_lifecycle(bucket, { rules: [lifecycleRule(parsed.ttlDays)] });
    await infrai.storage.object.put(bucket, key, { data_base64: Buffer.from(parsed.payload).toString("base64") });
    objectCreated = true;
    const handoff = chooseHandoff(parsed);
    await infrai.cron.create({ cron_expr: "0 3 * * *", task: marketplaceSweepTask() });
    return { bucket, key, buyerId: parsed.buyerId, buyerUpdate: parsed.buyerUpdate, orderId: parsed.orderId, handoff };
  } catch (error) {
    if (generatedBucket) {
      if (objectCreated) await infrai.storage.object.delete(bucket, key).catch(() => undefined);
      await infrai.storage.bucket.delete(bucket).catch(() => undefined);
    }
    throw error;
  }
}
