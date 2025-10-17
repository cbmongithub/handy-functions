import { afterEach, describe, expect, it, vi } from "vitest";
import { fetcher } from "../src/fetcher";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("fetcher", () => {
  it("parses JSON responses", async () => {
    const body = JSON.stringify({ hello: "world" });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: () => Promise.resolve(body),
    }) as unknown as typeof fetch;

    const result = await fetcher<{ hello: string }>("https://example.com");
    expect(result.hello).toBe("world");
  });

  it("returns undefined for empty responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
      text: () => Promise.resolve(""),
    }) as unknown as typeof fetch;

    const result = await fetcher("https://example.com/empty");
    expect(result).toBeUndefined();
  });

  it("throws errors with normalized message", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ message: "Boom" }),
    }) as unknown as typeof fetch;

    await expect(fetcher("https://example.com/error")).rejects.toThrow("Boom");
  });
});
