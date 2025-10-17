import { afterEach, describe, expect, it, vi } from "vitest";
import { retry } from "../src/retry";
import * as fetcherModule from "../src/fetcher";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("retry", () => {
  it("resolves on first attempt without retrying", async () => {
    const target = vi.fn().mockResolvedValue("ok");

    const result = await retry(target);

    expect(result).toBe("ok");
    expect(target).toHaveBeenCalledTimes(1);
  });

  it("retries failures and eventually returns success", async () => {
    const error = new Error("fail");
    const target = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("ok");

    const result = await retry(target, { attempts: 2, delay: 0 });

    expect(result).toBe("ok");
    expect(target).toHaveBeenCalledTimes(2);
  });

  it("stops when retryable callback returns false", async () => {
    const error = new Error("nope");
    const target = vi.fn().mockRejectedValue(error);

    await expect(
      retry(target, {
        attempts: 3,
        delay: 0,
        retryable: (_, attempt) => attempt === 0,
      })
    ).rejects.toThrow("nope");

    expect(target).toHaveBeenCalledTimes(1);
  });

  it("supports URL targets by delegating to fetcher", async () => {
    const fetchSpy = vi
      .spyOn(fetcherModule, "fetcher")
      .mockResolvedValue({ ok: true });

    const result = await retry<{ ok: boolean }>("https://example.com", {
      delay: 0,
    });

    expect(result).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("honors abort signals between attempts", async () => {
    vi.useFakeTimers();

    const controller = new AbortController();
    const abortError = new Error("cancelled");
    const error = new Error("flaky");
    const target = vi.fn().mockRejectedValue(error);

    const retryPromise = retry(target, {
      attempts: 3,
      delay: 50,
      signal: controller.signal,
    }).catch((err) => err);

    expect(target).toHaveBeenCalledTimes(1);

    controller.abort(abortError);

    if ("advanceTimersByTimeAsync" in vi) {
      await (vi as unknown as { advanceTimersByTimeAsync: (ms: number) => Promise<void> }).advanceTimersByTimeAsync(
        50
      );
    } else {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    }

    const result = await retryPromise;

    expect(result).toBe(abortError);
  });
});
