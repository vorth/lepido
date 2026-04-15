# Signal vs Store for Main Data Collection

## Signal (current approach)

**How it works now:** The data object is mutated directly, then a full `JSON.parse(JSON.stringify(data()))` roundtrip in `updateData()` triggers reactivity. Every subscriber re-runs on every change.

**Pros:**
- Simple mental model — one signal, one setter
- Works fine for modest data sizes
- Easy to serialize/persist (already doing this)

**Cons:**
- Every edit (even changing one specimen field) causes **all** consumers of `data()` to re-evaluate — `selectedSpecimen()`, `collectAllSpecimens()`, `labelSpecimens()`, the session tree, etc.
- The JSON roundtrip on every update is O(n) over the entire collection
- No way to subscribe to just "specimen #42 changed"

## Store (alternative)

**How it works:** `createStore` gives you a deeply reactive proxy. SolidJS tracks which exact nested paths each component reads, so only the relevant parts re-render when a nested property changes.

**Pros:**
- **Granular reactivity** — editing `store.collectingSession[0].specimen[3].genus` only notifies components that read that specific path
- No JSON roundtrip needed; you use `setStore("collectingSession", 0, "specimen", 3, "genus", "Pieris")` and SolidJS handles fine-grained updates
- Better scaling as the collection grows

**Cons:**
- **Nested update syntax is verbose** — the path-based `setStore` API takes getting used to, especially for a deeply-nested session tree
- **Harder to serialize** — stores are proxies, not plain objects. Need `unwrap()` or `structuredClone()` before `JSON.stringify`
- **Array operations are trickier** — push/splice need to go through `setStore` with `produce()` or path syntax
- **Current mutation-then-notify pattern breaks** — can't directly mutate store properties; all changes must go through the setter

## Recommendation

Given the current architecture — direct mutations, JSON roundtrip for notification, localStorage persistence — **switching to a store is a significant refactor** with real benefits only if:

1. The collection is large enough that full re-renders are noticeably slow
2. You want to eliminate the JSON serialize/deserialize on every keystroke

If the app feels responsive now, the signal approach is fine. If switching, the `produce()` utility from `solid-js/store` eases the transition since it allows imperative mutations (similar to the current style) inside the setter:

```js
import { createStore, produce, unwrap } from "solid-js/store";

const [data, setData] = createStore({ collectingSession: [], locations: {} });

// Updating a specimen
setData(produce(d => {
  Object.assign(specimen, updated);  // familiar mutation style
}));

// Serializing for save
const plain = unwrap(data);
localStorage.setItem("key", JSON.stringify(plain));
```

This gives granular reactivity while keeping mutation patterns mostly intact.
