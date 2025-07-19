import { createContext, onMount, createSignal } from "solid-js";

import { saveTextFile, saveTextFileAs } from './files.js';
import { SelectionProvider, useSelection } from "./context/selection.jsx";
import { ModeProvider } from "./context/mode.jsx";

const touchDevice = 'ontouchstart' in window;

export { touchDevice };

export const MainContext = createContext();

let fileHandle = null;

export const AppContext = (props) =>
{
  const [ data, setData ] = createSignal( {} );
  const [ localData, setLocalData ] = createSignal( {} );
  const [ localDirty, setLocalDirty ] = createSignal( false );
  const [ sourceData, setSourceData ] = createSignal( {} );
  const [ sourceDirty, setSourceDirty ] = createSignal( false );

  const [ lastOpenedSession, setLastOpenedSession ] = createSignal();

  const loadResource = async () =>
  {
    return fetch( './Lepid.json', { cache: 'no-store' }  )
      .then( response => response.text() )
      .then( text => {
        setSourceData( JSON.parse( text ) );
      } );
  }

  const loadFromResource = async () =>
  {
    return loadResource()
      .then( () => {
        setData( sourceData() );
        setSourceDirty( false );
        setLastOpenedSession( [ 'COLLECTION' ] );
      } );
  }

  const loadStorage = () =>
  {
    const stored = localStorage .getItem( 'lepido' );
    if ( !! stored ) {
      setLocalData( JSON.parse( stored ) );
      return true;
    }
    else
      return false;
  }

  const loadFromStorage = () =>
  {
    if ( loadStorage() ) {
      setData( localData() );
      setLocalDirty( false );
      setLastOpenedSession( [ 'COLLECTION' ] );
      return true;
    }
    return false;
  }

  const [ selectedSpecimen, setSelectedSpecimen ] = createSignal( {} );
  const clearSelection = () => setSelectedSpecimen( {} );
  const setSelection = ( id, path ) =>
  {
    if ( id === selectedSpecimen() ?.specimen )
      setSelectedSpecimen( {} );
    else
      setSelectedSpecimen( { specimen:id, container:path } );
  }

  const updateData = () =>
  {
    const text = JSON.stringify( data(), null, 2 );
    setData( JSON.parse( text ) );
    setLocalDirty( true );
    setSourceDirty( true );
  }

  const saveDataLocally = () =>
  {
    updateData();
    setLocalData( data() );
    const text = JSON.stringify( data(), null, 2 );
    localStorage .setItem( 'lepido', text );
    setLocalDirty( false );
  }

  const backUpFile = () =>
  {
    const text = JSON.stringify( data(), null, 2 );
    if ( !!fileHandle )
      saveTextFile( fileHandle, text, 'application/json' );
    else {
      let result = saveTextFileAs( 'Lepid.json', text, 'application/json' );
      if ( result.success ) {
        fileHandle = result.fileHandle;
      }
    }
    setSourceDirty( false );
  }

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
      setSelection( newSpecimen, parent );
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

  const reloadFromSource = () =>
  {
    saveDataLocally();
    backUpFile();
    loadFromResource();
  }

  const getNextId = () =>
  {
    const lastId = Number( data() .lastNumber );
    return lastId + 1;
  }

  const contextAPI = {
    data, localData, localDirty, sourceData, sourceDirty, loadStorage,
    loadFromResource, loadFromStorage, saveDataLocally, backUpFile,
    reloadFromSource,
    newSessionParent, saveNewSession, openSessionDialog,
    newSpecimenParent, saveNewSpecimen, openSpecimenDialog, getNextId,
    selectedSpecimen, clearSelection, setSelection,
    openSessionDialog, openSpecimenDialog,
    lastOpenedSession, setLastOpenedSession, moveSpecimen, getCollectingSession,
  };

  return (
    <ModeProvider>
      <MainContext.Provider value={ contextAPI }>
        <SelectionProvider collection={data()}>
          {props.children}
        </SelectionProvider>
      </MainContext.Provider>
    </ModeProvider>
  )
}
