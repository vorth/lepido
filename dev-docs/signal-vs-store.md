# Signal vs Store for Main Data Collection

**Status:** The collection now lives in a Solid store (`createStore`). This note explains why we changed it, how the store is set up, and what to watch for when changing it.

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

- **`src/model.js`**: functions that walk the session tree: `normalizeSession`, `findSpecimen`, `findSession` and `collectAllSpecimens`. They work the same on plain objects, store objects and `produce` drafts (the editable copy that `produce` hands you).
- **`src/component/data.jsx`** (`DataProvider`): holds the store and is the only code that writes to it.
- **`src/context/editor.jsx`**: all editing actions. Each one calls `modifyData`.
- **`src/context/selection.jsx`**: `selectedSpecimen` and `labelSpecimens` are `createMemo`s.

### Rules

**All writes go through `modifyData(recipe)`.** It runs `setData(produce(recipe))` and marks the data as changed (both dirty flags), inside one `batch`. Then it saves to localStorage once.

**Find the target inside the recipe, using the draft.** Store objects obtained outside the setter are read-only. Writing to one does nothing except print a warning in dev mode. This also applies inside `produce`: only the draft passed to the recipe, and objects reached through it, can be changed. So actions take an id, or a store object to look up, and find the real target inside the recipe:

```js
const editSpecimen = (id, updated) => modifyData(root => {
  const { specimen } = findSpecimen(root, id);
  if (!specimen) return;
  Object.assign(specimen, updated);
});
```

Sessions have no ids, so components pass the store object for the session. `findSession(root, target)` finds the draft for it by comparing `unwrap()` results; the draft and the store object share the same underlying raw object. If a reload has replaced that session in the meantime, `findSession` returns `null` and the action does nothing. Before, the change would have gone to the stale object.

**Load with `reconcile`.** `setData(obj)` at the root does a shallow merge, so keys missing from the new data would stay. `replaceData(json)` runs `setData(reconcile(normalizeSession(json)))`.

**Normalize when loading.** Some records converted from the old XML have a single `specimen` object instead of an array. `normalizeSession` turns these into arrays, so the rest of the code can assume `session.specimen` is an array or missing.

**Keep only the numbers from the saved copies.** For the localStorage and source copies, only `lastNumber` is kept (`localLastNumber()` and `sourceLastNumber()`). The app never holds a second reference to the data tree, so nothing can change a saved copy by accident.

**Saving:** `JSON.stringify(unwrap(data))`.

### Reading the store in components

- **Read store fields in the JSX or in an effect, not once at setup.** Components now stay alive between edits, so a value read once at setup will go out of date.
- **Comparing by identity works.** Solid returns the same store object for the same underlying object, so comparisons like `selectedSpecimen().container === props.session` are valid.
- **`selectedSpecimen` only notifies when the result changes.** It uses an `equals` check, so it only notifies when the selection resolves to a different specimen or session. Readers of the specimen's fields still update when those fields change, because they track the fields themselves.
- **`Object.entries(store)` notices added and removed keys**, so the details panel updates when a field is added to or removed from a specimen.

## Behavior changes from the migration

- Sessions you've opened stay open after an edit, because their components are no longer rebuilt.
- Before, any data change re-opened the session containing the selected specimen. Now that only happens when the selection changes, or when that session becomes the last-opened one.
- Importing builds all the new specimens first, then adds them and advances `lastNumber` in one update, instead of one per photo.
- Cancelling the New Session dialog no longer saves.

## Bugs fixed along the way

- **Move specimen:** it was broken. The details panel passed the specimen object, but the old `moveSpecimen` expected `{ container, specimen }`, so it threw an error. It also tested `Array.isArray` on a session object, so it would always have failed. Now `moveSpecimen(id)` removes the specimen from its current session and adds it to the destination, and does nothing if the destination is where the specimen already is.
- **Back Up:** it now waits for the save to finish. It also reads `result.handle` (the old code read `result.fileHandle`, which `saveTextFileAs` never returns). The file is now remembered after the first save instead of the save dialog opening every time.
- **Back Up and `sourceDirty`:** the flag is now cleared only when the save succeeds. Before, it was cleared even when the save was cancelled or failed.
  - The download fallback in `saveFileAs` (for browsers without the File System Access API) can't tell whether the user kept the file. It now reports success but returns no handle. Before, it reported failure, only so that no file name would be remembered.
- **Edit erased hidden fields:** saving the Edit Specimen dialog used to delete every field except `id` (for example `tag1` and `place`). Now `saveEditedSpecimen` only touches the fields listed in `SPECIMEN_DIALOG_FIELDS` (in `dialogs.jsx`).
  - A field in that list that is missing from the dialog's result was cleared by the user, so it is deleted. All other fields are kept.
  - `time` is in the list because the dialog shows it as `date` and saves it as `date`.
  - When you add a field to the dialog, add it to the list too.

## Known issues not addressed

- **Session paths use names, which may not be unique.** `getCollectingSession(path)` finds sessions by name, so if two sibling sessions share a name, Move goes to the first one.

## Alternative considered: `createMutable`

`createMutable` would have let the old direct-edit code (`parent.specimen.push(...)`, `Object.assign(specimen, …)`) stay almost unchanged, and it still updates only what changed. We rejected it because any code holding a reference could write anywhere. With `createStore`, all writes go through `modifyData`.
