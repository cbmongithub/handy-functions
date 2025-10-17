import type { BodyInit } from "bun";

/**
 * Safe subset of methods the helpers expose.
 */
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

/**
 * Extended RequestInit with typed method/body payloads.
 */
export type RequestOptions = Omit<RequestInit, "method" | "body"> & {
  method?: HttpMethod;
  body?: BodyInit | Record<string, unknown>;
};

/**
 * Body accepted by the verb helpers.
 */
export type RequestBody = BodyInit | Record<string, unknown>;

/**
 * Detects plain objects (prototype Object or null) for JSON serialization.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const shouldSerializeToJson = (
  value: unknown
): value is Record<string, unknown> | unknown[] =>
  isPlainObject(value) || Array.isArray(value);

/**
 * Normalizes error payloads into a friendly string.
 */
const extractErrorMessage = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as { message?: unknown }).message === "string"
  ) {
    return ((value as { message: string }).message || "").trim() || null;
  }

  return null;
};

/**
 * Fetch wrapper that keeps serialization, headers, and response parsing predictable.
 *
 * @template T Expected result type.
 * @param url Remote resource location.
 * @param options Request overrides including method, headers, and body.
 * @returns Parsed response as type `T` or `undefined` for empty responses.
 * @throws Error describing any non-ok HTTP response.
 */
export const fetcher = async <T>(
  url: string,
  options?: RequestOptions
): Promise<T> => {
  const { method = "GET", body, headers, ...restOptions } = options || {};

  const requestHeaders = new Headers(headers);
  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
    ...restOptions,
  };

  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      requestHeaders.delete("Content-Type");
      requestInit.body = body;
    } else if (shouldSerializeToJson(body)) {
      if (!requestHeaders.has("Content-Type")) {
        requestHeaders.set("Content-Type", "application/json");
      }
      requestInit.body = JSON.stringify(body);
    } else {
      requestInit.body = body;
    }
  }

  try {
    const response = await fetch(url, requestInit);

    if (!response.ok) {
      const errorMessage =
        (await response
          .json()
          .then((data) => extractErrorMessage(data))
          .catch(() => null)) || `HTTP error! Status: ${response.status}`;
      throw new Error(errorMessage);
    }

    const responseHasNoContent =
      method === "HEAD" ||
      response.status === 204 ||
      response.status === 205 ||
      response.status === 304 ||
      response.headers.get("content-length")?.trim() === "0";

    if (responseHasNoContent) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type")?.toLowerCase();
    if (contentType && contentType.includes("json")) {
      const text = await response.text();
      if (!text.trim()) {
        return undefined as T;
      }
      return JSON.parse(text) as T;
    }

    return (await response.text()) as T;
  } catch (error) {
    throw error;
  }
};

/** Issues a GET request and parses the response. */
export const get = <T>(
  url: string,
  options?: Omit<RequestOptions, "method" | "body">
) => fetcher<T>(url, { method: "GET", ...options });

/** Issues a POST request with optional JSON/body serialization. */
export const post = <T>(
  url: string,
  body: RequestBody,
  options?: Omit<RequestOptions, "method" | "body">
) => fetcher<T>(url, { method: "POST", body, ...options });

/** Issues a PUT request with optional JSON/body serialization. */
export const put = <T>(
  url: string,
  body: RequestBody,
  options?: Omit<RequestOptions, "method" | "body">
) => fetcher<T>(url, { method: "PUT", body, ...options });

/** Issues a PATCH request with optional JSON/body serialization. */
export const patch = <T>(
  url: string,
  body: RequestBody,
  options?: Omit<RequestOptions, "method" | "body">
) => fetcher<T>(url, { method: "PATCH", body, ...options });

/** Issues a DELETE request. */
export const del = <T>(
  url: string,
  options?: Omit<RequestOptions, "method" | "body">
) => fetcher<T>(url, { method: "DELETE", ...options });
