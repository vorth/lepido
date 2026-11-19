import { createContext, createSignal, useContext } from "solid-js";
import { useData } from "../component/data";
import { useSelection } from "./selection";
import { findSession, findSpecimen } from "../model";
import { SPECIMEN_DIALOG_FIELDS } from "../dialogs";

const EditorContext = createContext();

export const useEditor = () =>
{
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
}

const specimenFromPhoto = ( id, photo, envelope ) =>
{
  const { latitude, longitude, dateTimeOriginal, notes, temperature, elevation, collector, location, } = photo;
  const specimen = {
    id,
    envelope, temperature, elevation, collector, location,
    date: dateTimeOriginal,
    latLong: `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`
  };
  if ( notes ) {
    specimen.notes = notes;
  }
  return specimen;
}

export function EditorProvider(props) {
  const [ lastOpenedSession, setLastOpenedSession ] = createSignal();
  const { data, modifyData } = useData();
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
      modifyData( root => {
        const session = findSession( root, parent );
        if ( ! session ) return;
        if ( ! session.collectingSession ) {
          session.collectingSession = [];
        }
        session.collectingSession .push( newSession );
      } );
    }
  }

  const [ newSpecimenParent, setNewSpecimenParent ] = createSignal( null );
  const openSpecimenDialog = parent =>
  {
    setNewSpecimenParent( parent );
  }

  const [ editingSpecimen, setEditingSpecimen ] = createSignal( null );
  const openEditSpecimenDialog = specimen =>
  {
    setEditingSpecimen( specimen );
  }
  const saveEditedSpecimen = updated =>
  {
    const id = editingSpecimen() ?.id;
    setEditingSpecimen( null );
    if ( !!updated && !!id ) {
      modifyData( root => {
        const { specimen } = findSpecimen( root, id );
        if ( ! specimen ) return;
        // Fields the dialog doesn't show are left alone
        SPECIMEN_DIALOG_FIELDS.forEach( k => { if ( ! ( k in updated ) ) delete specimen[k]; } );
        Object.assign( specimen, updated );
      } );
    }
  }

  // Appends specimens to a session, advancing lastNumber and selecting the last one added
  const addSpecimens = ( parent, specimens ) =>
  {
    if ( specimens.length === 0 ) return;
    const lastId = specimens[ specimens.length - 1 ].id;
    modifyData( root => {
      const session = findSession( root, parent );
      if ( ! session ) return;
      if ( ! session.specimen ) {
        session.specimen = [];
      }
      session.specimen .push( ...specimens );
      root.lastNumber = lastId;
    } );
    setSelectedId( lastId );
  }
  const saveNewSpecimenFromDialog = newSpecimen =>
  {
    const parent = newSpecimenParent();
    setNewSpecimenParent( null );
    if ( !!newSpecimen ) {
      addSpecimens( parent, [ newSpecimen ] );
    }
  }

  const getCollectingSession = ( path, root = data ) =>
  {
    let session = root;
    for (const name of path.slice(1) ) {
      session = session ?.collectingSession ?.find( s => s.name === name );
    }
    return session;
  }

  const moveSpecimen = id =>
  {
    const path = lastOpenedSession();
    console.log( `moving specimen ${id} to session "${path.join('/')}"` );
    modifyData( root => {
      const { specimen, container } = findSpecimen( root, id );
      const dest = getCollectingSession( path, root );
      if ( !specimen || !dest || dest === container ) return;
      container.specimen .splice( container.specimen .indexOf( specimen ), 1 );
      if ( ! dest.specimen ) {
        dest.specimen = [];
      }
      dest.specimen .push( specimen );
    } );
  }

  const getNextId = () =>
  {
    const lastId = Number( data .lastNumber );
    return lastId + 1;
  }

  const importSpecimens = async (parent) => {
    try {
      const text = await navigator.clipboard.readText();
      const photos = JSON.parse(text);

      if (!Array.isArray(photos)) {
        throw new Error('Invalid photos file format - expected array');
      }

      const specimens = [];
      let id = getNextId();
      for (const photo of photos) {
        const { latitude, longitude, dateTimeOriginal, qrCode, multiplicity, } = photo;
        if (!latitude || !longitude || !dateTimeOriginal || !qrCode) {
          console.warn('Skipping photo with missing data:', photo);
          continue;
        }
        if ( multiplicity && multiplicity > 1 ) {
          for ( let i = 1; i <= multiplicity; i++ ) {
            specimens .push( specimenFromPhoto( id++, photo, `${qrCode}-${i}` ) );
          }
        } else {
          specimens .push( specimenFromPhoto( id++, photo, qrCode ) );
        }
      }
      addSpecimens( parent, specimens );

    } catch (err) {
      alert(`Error importing specimens: ${err.message}`);
    }
  };

  const contextValue = {
    lastOpenedSession, setLastOpenedSession,
    newSessionParent, saveNewSession, openSessionDialog,
    newSpecimenParent, openSpecimenDialog, getNextId, saveNewSpecimenFromDialog,
    editingSpecimen, openEditSpecimenDialog, saveEditedSpecimen,
    getCollectingSession, moveSpecimen,
    importSpecimens,
  };

  return (
    <EditorContext.Provider value={contextValue}>
      {props.children}
    </EditorContext.Provider>
  );
};
