import type { RequestOptions } from "./fetcher";
import { fetcher } from "./fetcher";

/**
 * Tuple describing a resolved async operation.
 */
type SuccessResult<T> = readonly [T, null];
/**
 * Tuple describing a rejected async operation.
 */
type ErrorResult<E = Error> = readonly [null, E];
/**
 * Union returned by {@link tryCatch}, similar to Go's error handling.
 */
type Result<T, E = Error> = SuccessResult<T> | ErrorResult<E>;
/**
 * Value or promise supported by {@link tryCatch}.
 */
type Awaitable<T> = T | Promise<T>;
/**
 * Promise factories supported by {@link tryCatch}.
 */
type PromiseSource<T> = Awaitable<T> | (() => Awaitable<T>);
/**
 * Inputs supported by {@link tryCatch}, including URLs for automatic fetching.
 */
type TryCatchInput<T> = PromiseSource<T> | string | URL;

const isFetchTarget = (value: unknown): value is string | URL =>
  typeof value === "string" || value instanceof URL;

const resolveInput = <T>(
  input: TryCatchInput<T>,
  requestOptions?: RequestOptions
): Awaitable<T> => {
  if (typeof input === "function") {
    return (input as () => Awaitable<T>)();
  }

  if (isFetchTarget(input)) {
    const url = input instanceof URL ? input.toString() : input;
    return fetcher<T>(url, requestOptions);
  }

  return input as Awaitable<T>;
};

/**
 * Awaits a promise (or promise-returning thunk) and returns a tuple of `[data, error]`.
 *
 * @template T Resolved value type.
 * @template E Error type.
 * @param input A promise, value, thunk returning an awaitable, or URL string for auto-fetching.
 * @param requestOptions Optional fetch configuration when `input` is a URL.
 * @returns `[value, null]` when successful or `[null, error]` when rejected.
 */
export const tryCatch = async <T, E = Error>(
  input: TryCatchInput<T>,
  requestOptions?: RequestOptions
): Promise<Result<T, E>> => {
  try {
    const data = await resolveInput(input, requestOptions);
    return [data, null] as const;
  } catch (error) {
    return [null, error as E] as const;
  }
};
