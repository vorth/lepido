
import { createContext, createSignal, useContext } from "solid-js";
import { useData } from "../component/data";
import { useSelection } from "./selection";

const EditorContext = createContext();

export const useEditor = () =>
{
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
}

export const EditorProvider = (props) =>
{
  const [ lastOpenedSession, setLastOpenedSession ] = createSignal();
  const { data, updateData, saveDataLocally } = useData();
  const { setSelectedId } = useSelection();

  const [ newSessionParent, setNewSessionParent ] = createSignal( null );
  const openSessionDialog = parent =>
  {
    setNewSessionParent( parent );
  }
  const saveNewSession = newSession =>
  {
    const parent = newSessionParent();
    setNewSessionParent( null );
    if ( !!newSession ) {
      if ( ! parent.collectingSession ) {
        parent.collectingSession = [];
      }
      parent.collectingSession .push( newSession );
    }
    updateData();
    saveDataLocally();
  }

  const [ newSpecimenParent, setNewSpecimenParent ] = createSignal( null );
  const openSpecimenDialog = parent =>
  {
    setNewSpecimenParent( parent );
  }
  const saveNewSpecimen = newSpecimen =>
  {
    const parent = newSpecimenParent();
    setNewSpecimenParent( null );
    if ( !!newSpecimen ) {
      if ( ! parent.specimen ) {
        parent.specimen = [];
      }
      parent.specimen .push( newSpecimen );
      data() .lastNumber = newSpecimen.id;
      updateData();
      saveDataLocally();
      setSelectedId( newSpecimen.id );
    }
  }

  const getCollectingSession = ( path ) =>
  {
    let session = data();
    for (const name of path.slice(1) ) {
      session = session.collectingSession.find( s => s.name === name );
    }
    return session;
  }

  const moveSpecimen = ( { container, specimen } ) =>
  {
    console.log( `moving specimen ${specimen.id} to session "${lastOpenedSession().join('/')}"` );
    if ( Array.isArray( container ) ) {
      const index = container .findIndex( e => e.id === specimen.id );
      if ( index > -1 ) { // only splice array when item is found
        container.splice( index, 1 ); // 2nd parameter means remove one item only
      }
      const dest = getCollectingSession( lastOpenedSession() ) .specimen;
      dest .push( specimen );
      updateData();
      saveDataLocally();
    } else {      
      console.log( 'NOT AN ARRAY' );
    }
  }

  const getNextId = () =>
  {
    const lastId = Number( data() .lastNumber );
    return lastId + 1;
  }

  const contextValue = {
    lastOpenedSession, setLastOpenedSession,
    newSessionParent, saveNewSession, openSessionDialog,
    newSpecimenParent, saveNewSpecimen, openSpecimenDialog, getNextId,
    openSessionDialog, openSpecimenDialog,
    getCollectingSession, moveSpecimen
  };

  return (
    <EditorContext.Provider value={contextValue}>
      {props.children}
    </EditorContext.Provider>
  );
};
