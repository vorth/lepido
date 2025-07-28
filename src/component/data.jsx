import { createContext, createSignal, useContext } from "solid-js";

import { saveTextFile, saveTextFileAs } from '../files.js';

const touchDevice = 'ontouchstart' in window; // not needed yet, but useful for future reference

export const DataContext = createContext();

export const useData = () =>
{
  const context = useContext( DataContext );
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

let fileHandle = null;

export const DataProvider = (props) =>
{
  const [ data, setData ] = createSignal( {} );
  const [ localData, setLocalData ] = createSignal( {} );
  const [ localDirty, setLocalDirty ] = createSignal( false );
  const [ sourceData, setSourceData ] = createSignal( {} );
  const [ sourceDirty, setSourceDirty ] = createSignal( false );

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
        // setLastOpenedSession( [ 'COLLECTION' ] );
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
      // setLastOpenedSession( [ 'COLLECTION' ] );
      return true;
    }
    return false;
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

  const reloadFromSource = () =>
  {
    saveDataLocally();
    backUpFile();
    loadFromResource();
  }

  const contextAPI = {
    data, localData, localDirty, sourceData, sourceDirty, loadStorage,
    loadFromResource, loadFromStorage, saveDataLocally, backUpFile,
    reloadFromSource, updateData,
  };

  return (
    <DataContext.Provider value={ contextAPI }>
      {props.children}
    </DataContext.Provider>
  )
}
