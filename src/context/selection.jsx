
import { createContext, createMemo, createProjection, createSignal, createStore, untrack, useContext } from "solid-js";
import { useData } from "../component/data";
import { collectAllSpecimens, findSessionPath, findSpecimen, sessionLabel } from "../model";

const SelectionContext = createContext();

// useContext throws ContextNotFoundError when there's no SelectionProvider
export const useSelection = () => useContext( SelectionContext );

export const SelectionProvider = (props) =>
{
  const [selectedId, setSelectedId] = createSignal(null);
  const [ labels, setLabels ] = createStore( {} ); // specimen id -> true while its label is selected
  const [ lastOpenedSession, setLastOpenedSession ] = createSignal( null ); // a session id
  const [ expanded, setExpanded ] = createStore( {} ); // session id -> true while its contents are shown
  const { data, revision } = useData();

  // Derives a value from a walk of the whole tree.  It tracks only `deps` and the data's
  //  revision; the walk itself is untracked, since it can read thousands of nodes.
  const fromTree = ( deps, walk ) => () =>
  {
    revision();
    const args = deps();
    return untrack( () => walk( args ) );
  }

  // Only notify dependents when the selection resolves to a different specimen or container,
  //  not on every unrelated edit to the tree.
  const selectedSpecimen = createMemo( fromTree( selectedId, id => findSpecimen( data, id ) ),
    { equals: ( a, b ) => a.specimen === b.specimen && a.container === b.container } );

  // Per-id maps for the specimen rows: `selected` here, and the `labels` store.  Each row reads
  //  only its own key, so a change updates just the rows whose answer flipped, not all ~1300.
  //  Keys are strings, so numeric and string forms of an id match.
  const selected = createProjection( draft => {
    const id = selectedId();
    for ( const key of Object.keys( draft ) ) {
      if ( key !== String( id ) ) delete draft[ key ];
    }
    if ( id != null ) draft[ id ] = true;
  }, {} );
  const isSelected = specimenID => !!selected[ specimenID ];
  const isLabelSelected = specimenID => !!labels[ specimenID ];
  const labelCount = createMemo( () => Object.keys( labels ) .length );

  const sessionName = sessionID => ( findSessionPath( data, sessionID ) || [] ) .map( sessionLabel ) .join( '/' );
  const lastOpenedSessionName = createMemo( fromTree( lastOpenedSession, sessionName ) );

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

  // Store writes build on each other within an event, so these can't lose updates
  const toggleLabelSelection = id =>
  {
    setLabels( d => { if ( d[ id ] ) delete d[ id ]; else d[ id ] = true; } );
  }

  const setLabelsSelected = ( ids, state ) =>
  {
    setLabels( d => { ids.forEach( id => { if ( state ) d[ id ] = true; else delete d[ id ]; } ); } );
  }

  const clearLabelSelection = () => setLabels( d => { Object.keys( d ).forEach( id => { delete d[ id ]; } ); } );

  // Object.keys() tracks which ids are labeled, so any addition or removal re-runs this
  const labelSpecimens = createMemo( fromTree( () => Object.keys( labels ), ids =>
    ids.length === 0 ? [] : collectAllSpecimens( data ) .filter( s => labels[ s.id ] ) ) );

  return (
    <SelectionContext value={{
      selectedId, selectSpecimen, selectedSpecimen, isSelected, isLabelSelected,
      lastOpenedSession, lastOpenedSessionName, isExpanded, toggleSession, revealSession,
      collectAllSpecimens,
      labelCount, toggleLabelSelection, setLabelsSelected, clearLabelSelection, labelSpecimens
    }}>
      {props.children}
    </SelectionContext>
  );
}
