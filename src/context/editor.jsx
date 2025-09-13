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

export function EditorProvider(props) {
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
  const saveNewSpecimen = ( newSpecimen, parent ) =>
  {
    if ( !!newSpecimen ) {
      if ( ! parent.specimen ) {
        parent.specimen = [];
      }
      parent.specimen .push( newSpecimen );
      data() .lastNumber = newSpecimen.id;
      setSelectedId( newSpecimen.id );
    }
  }
  const saveNewSpecimenFromDialog = newSpecimen =>
  {
    const parent = newSpecimenParent();
    setNewSpecimenParent( null );
    saveNewSpecimen( newSpecimen, parent );
    updateData();
    saveDataLocally();
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

  const importSpecimen = ( collection, photo, envelope ) => {
    const { latitude, longitude, dateTimeOriginal, notes, temperatureF } = photo;
    const id = getNextId();
    const specimen = {
      id,
      envelope, temperatureF,
      date: dateTimeOriginal,
      latLong: `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`
    };
    if ( notes ) {
      specimen.notes = notes;
    }
    saveNewSpecimen( specimen, collection );
  };

  const importSpecimens = async (parent) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        
        const photos = JSON.parse(text);

        if (!Array.isArray(photos)) {
          throw new Error('Invalid photos file format - expected array');
        }
        
        for (const photo of photos) {
          const { latitude, longitude, dateTimeOriginal, qrCode } = photo;
          if (!latitude || !longitude || !dateTimeOriginal || !qrCode) {
            console.warn('Skipping photo with missing data:', photo);
            continue;
          }
          importSpecimen( parent, photo, qrCode );
        }
        updateData();
        saveDataLocally();
        
      } catch (err) {
        alert(`Error importing specimens: ${err.message}`);
      }
    };
    
    input.click();
  };

  const contextValue = {
    lastOpenedSession, setLastOpenedSession,
    newSessionParent, saveNewSession, openSessionDialog,
    newSpecimenParent, saveNewSpecimen, openSpecimenDialog, getNextId, saveNewSpecimenFromDialog,
    openSessionDialog, openSpecimenDialog,
    getCollectingSession, moveSpecimen,
    importSpecimens,
  };

  return (
    <EditorContext.Provider value={contextValue}>
      {props.children}
    </EditorContext.Provider>
  );
};
