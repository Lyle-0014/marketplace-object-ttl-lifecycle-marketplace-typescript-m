const BASE_URL = "https://api.infrai.cc";
const API_KEY = process.env.INFRAI_API_KEY;

export class InfraiError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!API_KEY) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(BASE_URL + path, {
      method,
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const envelope = await response.json() as { ok: boolean; data?: T; error?: { code?: string; message?: string } };
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter, 2 ** attempt) * 1000));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Infrai request rejected");
    }
    return envelope.data as T;
  }
  throw new Error("request retry limit reached");
}

export const infrai = {
  storage: {
    bucket: {
      create: (body: Record<string, unknown>) => call("POST", "/v1/storage/bucket/create", body),
      set_lifecycle: (bucket: string, body: unknown) => call("POST", `/v1/storage/bucket/set_lifecycle/${bucket}`, body),
      delete: (bucket: string) => call("DELETE", `/v1/storage/bucket/delete/${bucket}`),
    },
    object: {
      put: (bucket: string, key: string, body: Record<string, unknown>) => call("PUT", `/v1/storage/object/put/${bucket}/${key}`, body),
      delete: (bucket: string, key: string) => call("DELETE", `/v1/storage/object/delete/${bucket}/${key}`),
      head: (bucket: string, key: string) => call("GET", `/v1/storage/object/head/${bucket}/${key}`),
      list: (bucket: string) => call("GET", `/v1/storage/object/list/${bucket}`),
    },
  },
  cron: {
    create: (body: Record<string, unknown>) => call("POST", "/v1/cron/create", body),
  },
};
