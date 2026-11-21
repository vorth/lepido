import { batch, createContext, createSignal, useContext } from "solid-js";
import { createStore, produce, reconcile, unwrap } from "solid-js/store";

import { saveTextFile, saveTextFileAs } from '../files.js';
import { normalizeCollection } from '../model.js';

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
  const [ data, setData ] = createStore( {} );
  const [ localLastNumber, setLocalLastNumber ] = createSignal();
  const [ localDirty, setLocalDirty ] = createSignal( false );
  const [ sourceLastNumber, setSourceLastNumber ] = createSignal();
  const [ sourceDirty, setSourceDirty ] = createSignal( false );

  // reconcile() rather than setData( json ), since a root-level set only merges shallowly
  const replaceData = json => setData( reconcile( normalizeCollection( json ) ) );

  const loadFromResource = async () =>
  {
    return fetch( './Lepid.json', { cache: 'no-store' }  )
      .then( response => response.text() )
      .then( text => {
        const json = JSON.parse( text );
        batch( () => {
          setSourceLastNumber( json.lastNumber );
          replaceData( json );
          setSourceDirty( false );
        } );
        // setLastOpenedSession( [ 'COLLECTION' ] );
      } );
  }

  const loadStorage = () =>
  {
    const stored = localStorage .getItem( 'lepido' );
    if ( !! stored ) {
      const json = JSON.parse( stored );
      setLocalLastNumber( json.lastNumber );
      return json;
    }
    else
      return null;
  }

  const loadFromStorage = () =>
  {
    const json = loadStorage();
    if ( !! json ) {
      batch( () => {
        replaceData( json );
        setLocalDirty( false );
      } );
      // setLastOpenedSession( [ 'COLLECTION' ] );
      return true;
    }
    return false;
  }

  const serialize = () => JSON.stringify( unwrap( data ), null, 2 );

  const saveDataLocally = () =>
  {
    localStorage .setItem( 'lepido', serialize() );
    batch( () => {
      setLocalLastNumber( data.lastNumber );
      setLocalDirty( false );
    } );
  }

  // Every change to the collection goes through here.  The recipe receives a mutable
  //  draft of the root; locate nodes within it (by id or with findSession) rather than
  //  mutating store objects obtained elsewhere, which are read-only.
  const modifyData = recipe =>
  {
    batch( () => {
      setData( produce( recipe ) );
      setLocalDirty( true );
      setSourceDirty( true );
    } );
    saveDataLocally();
  }

  const backUpFile = async () =>
  {
    const text = serialize();
    const result = !!fileHandle
      ? await saveTextFile( fileHandle, text, 'application/json' )
      : await saveTextFileAs( 'Lepid.json', text, 'application/json' );
    if ( result.success ) {
      fileHandle = result.handle || fileHandle;
      setSourceDirty( false );
    }
  }

  const reloadFromSource = async () =>
  {
    saveDataLocally();
    await backUpFile();
    return loadFromResource();
  }

  const contextAPI = {
    data, modifyData,
    localLastNumber, localDirty, sourceLastNumber, sourceDirty, loadStorage,
    loadFromResource, loadFromStorage, saveDataLocally, backUpFile,
    reloadFromSource,
  };

  return (
    <DataContext.Provider value={ contextAPI }>
      {props.children}
    </DataContext.Provider>
  )
}
