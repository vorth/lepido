import { createContext, createSignal, createStore, flush, reconcile, snapshot, useContext } from "solid-js";

import { saveTextFile, saveTextFileAs } from '../files.js';
import { normalizeCollection } from '../model.js';

const touchDevice = 'ontouchstart' in window; // not needed yet, but useful for future reference

export const DataContext = createContext();

// useContext throws ContextNotFoundError when there's no DataProvider
export const useData = () => useContext( DataContext );

let fileHandle = null;

export const DataProvider = (props) =>
{
  const [ data, setData ] = createStore( {} );
  const [ localLastNumber, setLocalLastNumber ] = createSignal();
  const [ localDirty, setLocalDirty ] = createSignal( false );
  const [ sourceLastNumber, setSourceLastNumber ] = createSignal();
  const [ sourceDirty, setSourceDirty ] = createSignal( false );

  // Writes apply on the next microtask; the flush() makes the new data readable as soon as
  //  this returns, so callers can look things up in it (e.g. select a specimen) right away.
  const replaceData = json =>
  {
    setData( reconcile( normalizeCollection( json ), 'id' ) );
    flush();
  }

  const loadFromResource = async () =>
  {
    return fetch( './Lepid.json', { cache: 'no-store' }  )
      .then( response => response.text() )
      .then( text => {
        const json = JSON.parse( text );
        setSourceLastNumber( json.lastNumber );
        setSourceDirty( false );
        replaceData( json );
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
      setLocalDirty( false );
      replaceData( json );
      // setLastOpenedSession( [ 'COLLECTION' ] );
      return true;
    }
    return false;
  }

  const serialize = () => JSON.stringify( snapshot( data ), null, 2 );

  const saveDataLocally = () =>
  {
    localStorage .setItem( 'lepido', serialize() );
    setLocalLastNumber( data.lastNumber );
    setLocalDirty( false );
  }

  // Every change to the collection goes through here.  The recipe receives a mutable
  //  draft of the root; locate nodes within it by id rather than mutating store objects
  //  obtained elsewhere, which are read-only.  As in replaceData, flush() applies the
  //  change at once, so it is saved (and visible to the caller) immediately.
  const modifyData = recipe =>
  {
    setData( recipe );
    setLocalDirty( true );
    setSourceDirty( true );
    flush();
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
    <DataContext value={ contextAPI }>
      {props.children}
    </DataContext>
  )
}
