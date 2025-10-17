import { afterEach, describe, expect, it, vi } from "vitest";
import { fetcher } from "../src/fetcher";

const originalFetch = globalThis.fetch;

afterEach(() => {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  } else {
    // @ts-expect-error - cleanup for environments without global fetch
    delete globalThis.fetch;
  }
  vi.restoreAllMocks();
});

describe("fetcher", () => {
  it("parses JSON responses", async () => {
    const body = JSON.stringify({ hello: "world" });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (key: string) =>
          key.toLowerCase() === "content-type" ? "application/json" : null,
      },
      text: () => Promise.resolve(body),
    }) as unknown as typeof fetch;

    const result = await fetcher<{ hello: string }>("https://example.com");
    expect(result.hello).toBe("world");
  });

  it("returns undefined for empty responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: {
        get: () => null,
      },
      text: () => Promise.resolve(""),
    }) as unknown as typeof fetch;

    const result = await fetcher("https://example.com/empty");
    expect(result).toBeUndefined();
  });

  it("throws errors with normalized message", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: {
        get: (key: string) =>
          key.toLowerCase() === "content-type" ? "application/json" : null,
      },
      json: () => Promise.resolve({ message: "Boom" }),
    }) as unknown as typeof fetch;

    await expect(fetcher("https://example.com/error")).rejects.toThrow("Boom");
  });
});
