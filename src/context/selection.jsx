
import { createContext, createMemo, createSignal, useContext } from "solid-js";
import { useData } from "../component/data";
import { collectAllSpecimens, findSpecimen } from "../model";

const SelectionContext = createContext();

export const useSelection = () =>
{
  const context = useContext( SelectionContext );
  if (!context) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
}

export const SelectionProvider = (props) =>
{
  const [selectedId, setSelectedId] = createSignal(null);
  const [labelSelection, setLabelSelection] = createSignal( new Set() );
  const { data } = useData();

  // Only notify dependents when the selection resolves to a different specimen or container,
  //  not on every unrelated edit to the tree.
  const selectedSpecimen = createMemo( () => findSpecimen( data, selectedId() ), undefined,
    { equals: ( a, b ) => a.specimen === b.specimen && a.container === b.container } );

  const toggleLabelSelection = (id, state) =>
  {
    const current = new Set( labelSelection() );
    if ( state === undefined ) {
      if ( current.has(id) ) {
        current.delete(id);
      } else {
        current.add(id);
      }
    } else if ( state ) {
      current.add(id);
    } else {
      current.delete(id);
    }
    setLabelSelection( current );
  }

  const clearLabelSelection = () => setLabelSelection( new Set() );

  const labelSpecimens = createMemo( () =>
  {
    const ids = labelSelection();
    if ( ids.size === 0 ) return [];
    const all = collectAllSpecimens( data );
    return all.filter( s => ids.has( s.id ) );
  } );

  return (
    <SelectionContext.Provider value={{
      selectedId, setSelectedId, selectedSpecimen,
      collectAllSpecimens,
      labelSelection, toggleLabelSelection, clearLabelSelection, labelSpecimens
    }}>
      {props.children}
    </SelectionContext.Provider>
  );
}
