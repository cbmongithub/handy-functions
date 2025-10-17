# handy-functions

Tiny, reusable helpers that remove the boilerplate from modern HTTP calls and error handling. `handy-functions` gives you a predictable fetch wrapper, typed verb shortcuts, and a flexible `tryCatch` utility so you can focus on application logic instead of plumbing.

> **Status**: early library – more helpers will be added as the toolkit grows.

## When To Use (and When Not)

- ✅ **Use it** when you manage many API requests, share utilities across projects, or ship SDK-like code. Centralizing the fetch contract keeps headers, serialization, and errors consistent everywhere.
- ✅ **Use it** in teams where a tuple-based `[data, error]` pattern improves clarity and avoids scattered `try…catch` blocks.
- 🚫 **Skip it** for one-off scripts or apps with only a couple of requests—the native `fetch` may be simpler.
- 🚫 **Skip it** if you already rely on a heavier request client (Axios, ky, etc.) unless you specifically want these lean abstractions.

## Installation

```bash
bun install handy-functions
# or
npm install handy-functions
```

## Usage

```ts
import { get, post, tryCatch } from "handy-functions";

type Todo = { id: number; title: string; completed: boolean };

// Fetch JSON with sensible defaults
const todos = await get<Todo[]>("https://jsonplaceholder.typicode.com/todos");

// POST body objects without manually stringifying
await post("https://jsonplaceholder.typicode.com/todos", {
  title: "Ship handy-functions",
  completed: false,
});

// Tuple-based error handling: fetch by URL string or supply a thunk/promise
const [profile, error] = await tryCatch<{ id: string; name: string }>(
  "https://api.example.com/users/42",
  { headers: { Authorization: `Bearer ${token}` } }
);

if (error) {
  console.error(error.message);
}
```

## Available Helpers

- `fetcher<T>(url, options?)` – core wrapper over `fetch` with JSON detection, body serialization (plain objects/arrays → JSON, `FormData` untouched), and normalized error messages.
- `get`, `post`, `put`, `patch`, `del` – verb-specific entry points that forward to `fetcher`, accepting any valid `BodyInit` for mutations.
- `tryCatch(input, requestOptions?)` – returns `[data, null]` or `[null, error]` while supporting:
  - plain values or promises,
  - promise-returning thunks,
  - URL strings (auto routed through `fetcher` with optional request options).

All exports are available through the main entry point (`import { ... } from "handy-functions"`).

## Building & Testing

```bash
# run vitest suites
bun test

# produce minified ESM + CJS bundles and declaration files
bun run build
```

The build uses Vite’s Rolldown bundler and aggressive Terser minimization (mangling, console stripping, multiple compression passes) to keep the footprint tiny.

## Contributing

This repository is still evolving. PRs and issues are welcome—just run `bun test` and `bun run build` before submitting. Future iterations will introduce more cross-project helpers, so feel free to suggest additions or enhancements.\*\*\*
