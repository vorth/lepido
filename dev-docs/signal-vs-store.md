# Signal vs Store for Main Data Collection

**Status:** The collection now lives in a Solid store (`createStore`), and the app runs on Solid 2.0. This note explains why we changed it, how the store is set up, and what to watch for when changing it. The Solid 2.0 section at the end covers what changed in the upgrade from 1.9.

## What the signal approach did

The collection (`Lepid.json`: about 300 sessions and 1,300 specimens) used to live in one `createSignal`. Edits changed the object directly, and then `updateData()` did a full `JSON.parse(JSON.stringify(data()))` copy so the signal would see a new value.

Speed was not the main problem. The real problems were:

1. **Every edit rebuilt the whole UI.** `<For>` matches list items by object identity. After the copy, every session and specimen was a new object, so every `CollectingSession` and `Specimen` component was destroyed and recreated. Two things only worked because of this:
   - The collapsed/expanded state had to live in a module-level `Map` in `session.jsx`, because no component survived an edit.
   - `Specimen` could read `id`, `genus` and `species` once by destructuring and still look correct.
2. **It happened twice per edit.** Each editor action called `updateData()` and then `saveDataLocally()`, which called `updateData()` again.
3. **The saved copies got changed by edits.** `setData(sourceData())` and `setData(localData())` made the live data the same object as the saved copy. The next edit changed that copy too, before the copy step separated them. For example, `data().lastNumber = …` also changed `sourceData`, so "Last ID (source)" stopped showing the source file's value.
4. **Dialogs could edit the wrong object.** The editor kept references to objects from before the copy (`newSessionParent`, `editingSpecimen`). If the tree was replaced while a dialog was open, the save changed an object that was no longer on screen.
5. **Lookups were repeated.** `selectedSpecimen` was a plain function, not a memo, and each `CollectingSession` called it in an effect. Every change caused one search of the whole tree per session, about 300 in total.

## How the store version works

### Where things live

- **`src/model.js`**: functions that walk the session tree: `normalizeCollection`, `newSessionId`, `findSpecimen`, `findSession`, `findSessionPath`, `sessionLabel` and `collectAllSpecimens`. They work the same on plain objects, store objects and `produce` drafts (the editable copy that `produce` hands you).
- **`src/component/data.jsx`** (`DataProvider`): holds the store and is the only code that writes to it.
- **`src/context/editor.jsx`**: all editing actions. Each one calls `modifyData`.
- **`src/context/selection.jsx`**: what's selected, which sessions are expanded, and the last-opened session, plus the actions that change them (`selectSpecimen`, `toggleSession`, `revealSession`). `selectedSpecimen` and `labelSpecimens` are `createMemo`s.

### Rules

**All writes go through `modifyData(recipe)`.** It runs `setData(recipe)`, marks the data as changed (both dirty flags), calls `flush()` to apply the change immediately, and then saves to localStorage once.

**Find the target inside the recipe, using the draft.** Store objects obtained outside the setter are read-only. Writing to one does nothing except print a warning in dev mode. This also applies inside the setter: only the draft passed to the recipe, and objects reached through it, can be changed. So actions take ids (specimen ids or session ids) and find the real target inside the recipe:

```js
const editSpecimen = (id, updated) => modifyData(root => {
  const { specimen } = findSpecimen(root, id);
  if (!specimen) return;
  Object.assign(specimen, updated);
});
```

If a reload has removed the target in the meantime, the lookup returns nothing and the action does nothing. Before the store, the change would have gone to a stale object.

**Load with `reconcile`.** `setData(obj)` at the root does a shallow merge, so keys missing from the new data would stay. `replaceData(json)` runs `setData(reconcile(normalizeCollection(json), 'id'))` and then `flush()`. Matching array items by `id` means an unchanged specimen or session keeps its store object across a reload.

**Normalize when loading.** `normalizeCollection` does two things:
- Some records converted from the old XML have a single `specimen` object instead of an array. It turns these into arrays, so the rest of the code can assume `session.specimen` is an array or missing.
- It gives every session without one an `id` of the form `s<n>` (the root included), numbering after the highest existing id.

**Session ids are stored in the data.** Ids are assigned at load and saved with the collection, so they reach `Lepid.json` at the next Back Up. Until then the same source file always gets the same ids, because they're assigned in tree order. Existing ids never change. New sessions get `newSessionId(root)`. Specimen ids and session ids never collide in lookups, because they live in different arrays (`specimen` vs `collectingSession`).

**Keep only the numbers from the saved copies.** For the localStorage and source copies, only `lastNumber` is kept (`localLastNumber()` and `sourceLastNumber()`). The app never holds a second reference to the data tree, so nothing can change a saved copy by accident.

**Saving:** `JSON.stringify(snapshot(data))`.

### Reading the store in components

- **Read store fields in the JSX or in an effect, not once at setup.** Components now stay alive between edits, so a value read once at setup will go out of date. Solid 2.0 also warns in dev mode about reads at the top level of a component. Where a one-time read is intended, as in `SpecimenForm`, wrap it in `untrack`.
- **Comparing by identity works.** Solid returns the same store object for the same underlying object, so comparisons like `selectedSpecimen().container === props.session` are valid.
- **`selectedSpecimen` only notifies when the result changes.** It uses an `equals` check, so it only notifies when the selection resolves to a different specimen or session. Readers of the specimen's fields still update when those fields change, because they track the fields themselves.
- **`Object.entries(store)` notices added and removed keys**, so the details panel updates when a field is added to or removed from a specimen.
- **Rows read per-id maps, not shared signals.** Don't make every `Specimen` row compare against one signal (`selectedId() === id`): changing it re-runs all ~2,600 readers, and Solid 2.0's dev build warns with `HUGE_FAN_OUT`. The selection context keeps two maps keyed by id. Rows call `isSelected(id)` and `isLabelSelected(id)`, so only the rows whose answer flipped update.
  - **The selected specimen** is a `createProjection` built from the `selectedId` signal, since only one specimen is ever selected.
  - **Label selection** is a plain store, `labels` (`{ [id]: true }`), changed directly by `toggleLabelSelection`, `setLabelsSelected` and `clearLabelSelection`. `labelCount()` gives the number of keys.
  - Keys are strings, so `'508'` from the URL matches either form of the id. Specimens with no `id` (three released 2025 individuals) all share the key `undefined`, so they're selected for labels together, and the count is lower than the number of labels shown.
  - Use the same pattern for any new per-row state.
- **Memos that walk the whole tree track `revision`, not the tree.** `selectedSpecimen`, `labelSpecimens` and `lastOpenedSessionName` walk the tree, and a tracked walk subscribes to every node it reads (3,956 for `labelSpecimens`, which triggered `HUGE_FAN_IN`). The data layer bumps a `revision` signal in `modifyData` and `replaceData`. The `fromTree(deps, walk)` helper in `selection.jsx` tracks `revision` and `deps`, and runs the walk inside `untrack`. Anything that changes the collection must go through `modifyData` or `replaceData`, or these memos won't notice.

## UI state: selection and expansion

Which sessions are expanded is kept in one store in the selection context (`expanded`, keyed by session id), not in each `CollectingSession`. It's changed only by actions, never by effects:
- `toggleSession(id)` expands or collapses one session, records it as the last-opened session when expanding, and clears the selection.
- `selectSpecimen(id)` selects a specimen and expands every session from the root down to the one holding it. Selecting `null` clears the selection.
- `moveSpecimen` calls `selectSpecimen` afterwards, so the destination is visible even if it was collapsed after being opened.

`lastOpenedSession` is a session id. `lastOpenedSessionName()` gives the display path (for example `COLLECTION/specimens/purchased`).

This replaces the module-level `Map` and the two effects in `session.jsx` that set `specimensCollapsed`. It's also what Solid 2.0 expects, since 2.0 doesn't allow writing signals inside effects.

## Dialogs

The dialogs use the native `<dialog>` element (`Modal` in `dialogs.jsx`), not SUID. SUID has no Solid 2.0 support, so it was removed, and the JS bundle went from 148 kB to 36 kB.
- `NewSession` and `SpecimenDialog` render their form only while `show` is true. `Modal` calls `showModal()` in `onSettled`, once it's in the document.
- Each form is created when the dialog opens, so it sets its fields from `props` once, when it's created. This replaces the effect that wrote 12 signals whenever the dialog opened.
- Escape and clicks on the backdrop cancel.

## Behavior changes from the migration

- Sessions you've opened stay open after an edit, because their components are no longer rebuilt.
- Before, any data change re-opened the session containing the selected specimen. Now that only happens when the selection changes, or when that session becomes the last-opened one.
- Importing builds all the new specimens first, then adds them and advances `lastNumber` in one update, instead of one per photo.
- Cancelling the New Session dialog no longer saves.
- Selecting a specimen, either through `?id=` in the URL or after a move, now expands every session above it, not just the one holding it.
- The dialogs start empty each time they open: a New Session name typed earlier, or the previous specimen's latLong, is no longer carried over. They're styled to match the app's dark theme instead of Material.

## Bugs fixed along the way

- **Move specimen:** it was broken. The details panel passed the specimen object, but the old `moveSpecimen` expected `{ container, specimen }`, so it threw an error. It also tested `Array.isArray` on a session object, so it would always have failed. Now `moveSpecimen(id)` removes the specimen from its current session and adds it to the destination, and does nothing if the destination is where the specimen already is.
- **Back Up:** it now waits for the save to finish. It also reads `result.handle` (the old code read `result.fileHandle`, which `saveTextFileAs` never returns). The file is now remembered after the first save instead of the save dialog opening every time.
- **Back Up and `sourceDirty`:** the flag is now cleared only when the save succeeds. Before, it was cleared even when the save was cancelled or failed.
  - The download fallback in `saveFileAs` (for browsers without the File System Access API) can't tell whether the user kept the file. It now reports success but returns no handle. Before, it reported failure, only so that no file name would be remembered.
- **Edit erased hidden fields:** saving the Edit Specimen dialog used to delete every field except `id` (for example `tag1` and `place`). Now `saveEditedSpecimen` only touches the fields listed in `SPECIMEN_DIALOG_FIELDS` (in `dialogs.jsx`).
  - A field in that list that is missing from the dialog's result was cleared by the user, so it is deleted. All other fields are kept.
  - `time` is in the list because the dialog shows it as `date` and saves it as `date`.
  - When you add a field to the dialog, add it to the list too.
  - The form itself renders from lists in `dialogs.jsx`: `SPECIMEN_INPUTS` (the inputs, in display order) and `ALWAYS_SAVED` (fields saved even when empty; the rest are saved only when filled in). The values live in one store, `fields`. To add a field, add its name to `SPECIMEN_INPUTS` and to `SPECIMEN_DIALOG_FIELDS`. Its position in `SPECIMEN_DIALOG_FIELDS` sets where it's saved in the specimen record.

- **Duplicate session names:** Move used to find its destination by the path of session names, so if two sibling sessions shared a name it went to the first one. Sessions now have ids, and Move uses them.

## Alternative considered: `createMutable`

`createMutable` would have let the old direct-edit code (`parent.specimen.push(...)`, `Object.assign(specimen, …)`) stay almost unchanged, and it still updates only what changed. We rejected it because any code holding a reference could write anywhere. With `createStore`, all writes go through `modifyData`.

## Solid 2.0

The app moved from Solid 1.9 to 2.0.3. The packages changed:
- `@solidjs/web` added; `render` is now imported from it.
- `vite-plugin-solid` replaced by `@solidjs/vite-plugin` 3.
- Vite 5 → 8.

The JS bundle grew from 36 kB to 82 kB (31 kB gzipped), mostly Solid 2.0's runtime.

### What changed in the code

- **Imports:** store functions (`createStore`, `reconcile`, `snapshot`) come from `solid-js`; `solid-js/store` and `solid-js/web` are gone.
- **Setters take drafts.** The setter only takes a function that edits a draft, so `produce` is gone (it's effectively built in), and so are path setters like `setExpanded(id, false)` and object merges. Write `setExpanded(e => { e[id] = false; })` instead.
- **`unwrap` → `snapshot`.**
- **`batch` is gone.** Writes are batched automatically and applied on the next microtask.
- **Writes are deferred.** Reading a signal or store right after writing it returns the old value until `flush()` runs. `modifyData` and `replaceData` call `flush()` so callers can read the new data immediately; for example, `addSpecimens` selects the specimen it just added. If you add another write that something reads right away, flush it the same way.
- **Several updates to one signal in the same event need the setter's function form.** Copying from a read (`const next = new Set(sig()); …; setSig(next)`) keeps only the last update, because every read returns the value from before the first write. That caused a bug: when label selection was a `Set` in a signal, "toggle labels" showed one label instead of the whole session's. Write `setSig(current => …)`, which receives the pending value. Store setters don't have this problem: several draft writes in one event build on each other. That's one reason label selection is now a store.
- **`createMemo(fn, options)`:** the second argument is now the options (`{ equals }`); there is no initial-value argument.
- **`createEffect(compute, apply)`:** effects always take two functions. The first tracks the values the effect depends on; the second does the work. `Specimen`'s scroll-into-view is `createEffect(isSelected, selected => …)`. Writing signals inside effects or memos warns in dev mode, which is why expansion is done by actions (see above).
- **`onMount` → `onSettled`.**
- **Contexts are their own providers:** `<DataContext value={…}>`, not `<DataContext.Provider>`. `useContext` throws `ContextNotFoundError` when a context with no default has no provider, so the `use…` hooks no longer check for that themselves. `ModeContext` has a default value, so it never throws.
- **`classList` → `class`** with an array and an object: `class={['specimen', { selected: isSelected() }]}`.

### What didn't need to change

`onClick` (already camelCase), `ref={elt}`, `<For>` (by default the child still receives the item itself; an undefined `each` renders nothing), `<Show>` with plain children, and reading `props.x` in JSX.

