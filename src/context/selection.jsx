
import { createContext, createSignal, useContext } from "solid-js";
import { useData } from "../component/data";

const findSpecimen = ( session, specimenID ) =>
{
  if ( !session || !specimenID ) {
    return {};
  }
  if ( Array.isArray( session.specimen ) ) {
    const specimen = session.specimen.find( s => s.id == specimenID ); // intentional loose equality
    if ( !! specimen ) {
      return { specimen, container: session };
    }
  }
  if ( Array.isArray( session.collectingSession ) ) {
    for (const subSession of session.collectingSession ) {
      const found = findSpecimen( subSession, specimenID );
      if ( !! found.specimen ) {
        return found;
      }
    }
  }
  return {};
}

const collectAllSpecimens = ( session, result = [] ) =>
{
  if ( !session ) return result;
  if ( Array.isArray( session.specimen ) ) {
    result.push( ...session.specimen );
  } else if ( session.specimen ) {
    result.push( session.specimen );
  }
  if ( Array.isArray( session.collectingSession ) ) {
    for ( const sub of session.collectingSession ) {
      collectAllSpecimens( sub, result );
    }
  }
  return result;
}

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
  const { data } = useData();;

  const selectedSpecimen = () => findSpecimen( data(), selectedId() );

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

  const labelSpecimens = () =>
  {
    const ids = labelSelection();
    if ( ids.size === 0 ) return [];
    const all = collectAllSpecimens( data() );
    return all.filter( s => ids.has( s.id ) );
  }

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