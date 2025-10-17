import { afterEach, describe, expect, it, vi } from "vitest";
import * as fetcherModule from "../src/fetcher";
import { tryCatch } from "../src/try-catch";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tryCatch", () => {
  it("resolves promise-returning thunks", async () => {
    const [value, error] = await tryCatch(async () => "done");
    expect(value).toBe("done");
    expect(error).toBeNull();
  });

  it("captures rejected promises", async () => {
    const [value, error] = await tryCatch(async () => {
      throw new Error("nope");
    });
    expect(value).toBeNull();
    expect(error?.message).toBe("nope");
  });

  it("fetches when provided a URL", async () => {
    const fetchSpy = vi
      .spyOn(fetcherModule, "fetcher")
      .mockResolvedValue({ id: 1 });

    const [value, error] = await tryCatch<{ id: number }>(
      "https://example.com/users/1"
    );

    expect(error).toBeNull();
    expect(value).toEqual({ id: 1 });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/users/1",
      undefined
    );
  });

  it("passes request options to fetcher when provided", async () => {
    const fetchSpy = vi
      .spyOn(fetcherModule, "fetcher")
      .mockResolvedValue({ ok: true });

    const options = { method: "POST" as const };
    await tryCatch("https://example.com/action", options);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/action",
      options
    );
  });
});
