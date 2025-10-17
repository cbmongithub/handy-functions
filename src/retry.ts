import type { RequestOptions } from "./fetcher";
import { fetcher } from "./fetcher";

/** Generates the wait time (ms) before a retry attempt. */
type DelayFunction = (attempt: number) => number;

/**
 * Configuration for {@link retry}.
 */
export type RetryOptions = {
  /** Total number of attempts (initial try + retries). Defaults to 3. */
  attempts?: number;
  /** Fixed delay (ms) or function returning delay per attempt. */
  delay?: number | DelayFunction;
  /** Abort signal to cancel between attempts. */
  signal?: AbortSignal;
  /** Predicate that determines whether an error should be retried. */
  retryable?: (error: unknown, attempt: number) => boolean;
};

type RetryTarget<T> = (() => Promise<T>) | string | URL;

const isFetchTarget = (value: unknown): value is string | URL =>
  typeof value === "string" || value instanceof URL;

const defaultDelay: DelayFunction = (attempt) => {
  const baseDelay = 200;
  const jitter = Math.random() * 0.3 + 0.85;
  return Math.round(baseDelay * 2 ** attempt * jitter);
};

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      return reject(signal.reason);
    }

    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, ms);

    function handleAbort() {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", handleAbort);
      reject(signal?.reason);
    }

    if (signal) {
      signal.addEventListener("abort", handleAbort, { once: true });
    }
  });

const resolveTarget = <T>(
  target: RetryTarget<T>,
  requestOptions?: RequestOptions
) => {
  if (typeof target === "function") {
    return target();
  }

  if (isFetchTarget(target)) {
    const url = target instanceof URL ? target.toString() : target;
    return fetcher<T>(url, requestOptions);
  }

  return Promise.resolve(target as T);
};

/**
 * Retries an async operation with configurable attempts, backoff, and retry rules.
 *
 * @template T Result type.
 * @param target Promise-returning function or URL string for automatic fetching.
 * @param retryOptions Retry behaviour configuration.
 * @param requestOptions Optional fetch configuration when `target` is a URL.
 * @returns The resolved value from the first successful attempt.
 * @throws The last encountered error when retries are exhausted or deemed non-retryable.
 */
export const retry = async <T>(
  target: RetryTarget<T>,
  retryOptions: RetryOptions = {},
  requestOptions?: RequestOptions
): Promise<T> => {
  const {
    attempts = 3,
    delay = defaultDelay,
    signal,
    retryable = () => true,
  } = retryOptions;

  if (attempts < 1) {
    throw new Error("retry: attempts must be at least 1");
  }

  let attempt = 0;
  let lastError: unknown;

  while (attempt < attempts) {
    try {
      return await resolveTarget(target, requestOptions);
    } catch (error) {
      if (signal?.aborted) {
        throw (signal.reason as unknown) ?? error;
      }

      lastError = error;
      attempt += 1;

      const shouldRetry = attempt < attempts && retryable(error, attempt);

      if (!shouldRetry) {
        throw error;
      }

      const delayMs =
        typeof delay === "function" ? delay(attempt) : Math.max(delay, 0);

      await wait(delayMs, signal);
    }
  }

  throw lastError;
};
