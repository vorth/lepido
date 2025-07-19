
import { createContext, createSignal, useContext } from "solid-js";

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

  const selectedSpecimen = () => findSpecimen( props.collection, selectedId() );

  return (
    <SelectionContext.Provider value={{ selectedId, setSelectedId, selectedSpecimen }}>
      {props.children}
    </SelectionContext.Provider>
  );
}