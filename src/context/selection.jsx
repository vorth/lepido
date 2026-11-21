
import { createContext, createMemo, createSignal, createStore, useContext } from "solid-js";
import { useData } from "../component/data";
import { collectAllSpecimens, findSessionPath, findSpecimen, sessionLabel } from "../model";

const SelectionContext = createContext();

// useContext throws ContextNotFoundError when there's no SelectionProvider
export const useSelection = () => useContext( SelectionContext );

export const SelectionProvider = (props) =>
{
  const [selectedId, setSelectedId] = createSignal(null);
  const [labelSelection, setLabelSelection] = createSignal( new Set() );
  const [ lastOpenedSession, setLastOpenedSession ] = createSignal( null ); // a session id
  const [ expanded, setExpanded ] = createStore( {} ); // session id -> true while its contents are shown
  const { data } = useData();

  // Only notify dependents when the selection resolves to a different specimen or container,
  //  not on every unrelated edit to the tree.
  const selectedSpecimen = createMemo( () => findSpecimen( data, selectedId() ),
    { equals: ( a, b ) => a.specimen === b.specimen && a.container === b.container } );

  const sessionName = sessionID => ( findSessionPath( data, sessionID ) || [] ) .map( sessionLabel ) .join( '/' );
  const lastOpenedSessionName = createMemo( () => sessionName( lastOpenedSession() ) );

  const isExpanded = sessionID => !!expanded[ sessionID ];

  // Expands every session from the root down to the given one, so its contents are visible
  const revealSession = sessionID =>
  {
    const path = findSessionPath( data, sessionID ) || [];
    setExpanded( e => { path.forEach( session => { e[ session.id ] = true; } ); } );
  }

  // Selects a specimen (or clears the selection, given null) and reveals the session holding it
  const selectSpecimen = specimenID =>
  {
    setSelectedId( specimenID );
    const { container } = findSpecimen( data, specimenID );
    if ( !! container ) {
      revealSession( container.id );
    }
  }

  const toggleSession = sessionID =>
  {
    const opening = ! isExpanded( sessionID );
    setExpanded( e => { e[ sessionID ] = opening; } );
    if ( opening ) {
      setLastOpenedSession( sessionID );
    }
    setSelectedId( null );
  }

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
    <SelectionContext value={{
      selectedId, selectSpecimen, selectedSpecimen,
      lastOpenedSession, lastOpenedSessionName, isExpanded, toggleSession, revealSession,
      collectAllSpecimens,
      labelSelection, toggleLabelSelection, clearLabelSelection, labelSpecimens
    }}>
      {props.children}
    </SelectionContext>
  );
}
