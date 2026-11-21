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
  // Bumped on every change to the collection, for derivations that walk the whole tree:
  //  tracking this one signal is far cheaper than tracking the thousands of nodes they read.
  const [ revision, setRevision ] = createSignal( 0 );

  // Writes apply on the next microtask; the flush() makes the new data readable as soon as
  //  this returns, so callers can look things up in it (e.g. select a specimen) right away.
  const replaceData = json =>
  {
    setData( reconcile( normalizeCollection( json ), 'id' ) );
    setRevision( r => r + 1 );
    flush();
  }

  const fetchSource = async () =>
  {
    const response = await fetch( './Lepid.json', { cache: 'no-store' } );
    const json = JSON.parse( await response.text() );
    setSourceLastNumber( json.lastNumber );
    return json;
  }

  const loadFromResource = async () =>
  {
    const json = await fetchSource();
    setSourceDirty( false );
    replaceData( json );
    // setLastOpenedSession( [ 'COLLECTION' ] );
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

  // At startup, curators resume from the autosaved local copy, so edits not yet backed up
  //  survive a reload.  The source wins only when it has moved past the local copy
  //  (e.g. specimens added elsewhere and published).
  const loadInitial = async preferLocal =>
  {
    const source = await fetchSource();
    const local = preferLocal && loadStorage();
    if ( !! local && !( source.lastNumber > local.lastNumber ) ) {
      setLocalDirty( false );
      replaceData( local );
    }
    else {
      setSourceDirty( false );
      replaceData( source );
    }
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
    setRevision( r => r + 1 );
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
    data, modifyData, revision,
    localLastNumber, localDirty, sourceLastNumber, sourceDirty, loadStorage,
    loadInitial, loadFromResource, loadFromStorage, saveDataLocally, backUpFile,
    reloadFromSource,
  };

  return (
    <DataContext value={ contextAPI }>
      {props.children}
    </DataContext>
  )
}
