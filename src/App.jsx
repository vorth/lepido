
import { createContext, createSignal, onMount, useContext } from 'solid-js'

import './App.css'
import { saveTextFile, saveTextFileAs } from './files.js';
import { createSession, NewSession, NewSpecimen } from './dialogs.jsx';

const Specimen = props =>
{
  const { id = '', genus = '', species = '' } = props.specimen; // an actual reference to the parsed data
  const { selectedSpecimen, setSelection } = useContext( SelectionContext );
  const clickHandler = e =>
  {
    e .stopPropagation();
    setSelection( props.specimen, props.container );
  }

  return (
    <li id={`id-${props.specimen.id}`} class='specimen' onClick={clickHandler} classList={ { selected: selectedSpecimen() ?.specimen ?.id === props.specimen.id } } >
      {`${id} ${genus} ${species}`}
    </li>
  );
}

const Field = props =>
{
  return (
    <div>
      {`${props.key}: ${props.value || ''}`}
    </div>
  );
}

const SpecimenDetails = props =>
{
  const { lastOpenedSession, moveSpecimen } = useContext( SelectionContext );
  const handleMove = () => moveSpecimen( props.selection );

  return (
    <Show when={ !! props.selection?.specimen }>
      <div id="selectedSpecimen" >
        <For each={ Object.entries( props.selection.specimen ) } >{ ( [key, value] ) =>
          <Field key={key} value={value} />
        }</For>
      </div>
      {( !! lastOpenedSession() ) &&  <button class='move-button' onClick={handleMove}>Move to {lastOpenedSession().join('/')}</button>}
    </Show>
  );
}

const AddSession = props =>
{
  const { openSessionDialog } = useContext( SelectionContext );
  const handleClick = e =>
  {
    e .stopPropagation();
    openSessionDialog( props.parent );
  }

  return (
    <button class='add-session add-button' onClick={handleClick}>+</button>
  );
}


const AddSpecimen = props =>
  {
    const { openSpecimenDialog } = useContext( SelectionContext );
    const handleClick = e =>
    {
      e .stopPropagation();
      openSpecimenDialog( props.parent );
    }
  
    return (
      <button class='add-specimen add-button' onClick={handleClick}>+</button>
    );
  }

const CollectingSession = props =>
{
  const { clearSelection, setLastOpenedSession } = useContext( SelectionContext );
  const [ specimensCollapsed, setSpecimensCollapsed ] = createSignal( true );
  const [ sessionsCollapsed, setSessionsCollapsed ] = createSignal( false );
  const name = () => props.session.name || 'COLLECTION';
  const path = () => [ ...props.path, name() ];

  const toggleCollapsed = e =>
  {
    e .stopPropagation();
    if ( specimensCollapsed() ) {
      // opening specimens of this session
      console.log( `destination is ${JSON.stringify(path())}`);
      setLastOpenedSession( path() );
    }
    setSpecimensCollapsed( val => !val );
    clearSelection();
  }

  return (
    <div class="session" onClick={ toggleCollapsed }>
      {name()}
      <ul class='sessionList'>
        <Show when={ !specimensCollapsed() }>
          <Show when={ Array.isArray( props.session.specimen ) } fallback={
            props.session.specimen && <Specimen specimen={props.session.specimen} container={props.session} />
          }>
            <For each={props.session.specimen}>{ specimen =>
              <Specimen specimen={specimen} container={props.session.specimen}/>
            }</For>
          </Show>
        </Show>
        <Show when={ !sessionsCollapsed() }>
          <For each={props.session.collectingSession}>{ session =>
            <li>
              <CollectingSession session={ session } path={path()} />
            </li>
          }</For>
        </Show>
      </ul>
      <Show when={ !specimensCollapsed() } fallback={
        <AddSession parent={props.session}/>
      }>
        <AddSpecimen parent={props.session} />
      </Show>
    </div>
  );
}

const SelectionContext = createContext( {} );

let fileHandle = null;

const App = () =>
{
  const [ data, setData ] = createSignal( {} );
  const [ lastOpenedSession, setLastOpenedSession ] = createSignal();

  const loadFromResource = () =>
  {
    fetch( './Lepid.json' )
      .then( response => response.text() )
      .then( text => {
        setData( JSON.parse( text ) );
        setLastOpenedSession( [ 'COLLECTION' ] );
      } );
  }

  const loadFromStorage = () =>
  {
    const stored = localStorage .getItem( 'lepido' );
    if ( !! stored ) {
      setData( JSON.parse( stored ) );
      setLastOpenedSession( [ 'COLLECTION' ] );
      return true;
    }
    else
      return false;
  }

  const [ selectedSpecimen, setSelectedSpecimen ] = createSignal( {} );
  const clearSelection = () => setSelectedSpecimen( null );
  const setSelection = ( selection, container ) =>
  {
    if ( selection ?.id === selectedSpecimen() ?.specimen ?.id )
      setSelectedSpecimen( {} );
    else
      setSelectedSpecimen( {specimen:selection,container} );
  }

  const updateData = () =>
  {
    const text = JSON.stringify( data(), null, 2 );
    setData( JSON.parse( text ) );
    localStorage .setItem( 'lepido', text );
  }

  const saveDataLocally = () =>
  {
    const text = JSON.stringify( data(), null, 2 );
    localStorage .setItem( 'lepido', text );
    if ( !!fileHandle )
      saveTextFile( fileHandle, text, 'application/json' );
    else {
      let result = saveTextFileAs( 'Lepid.json', text, 'application/json' );
      if ( result.success ) {
        fileHandle = result.fileHandle;
      }
    }
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
      } else {      
        console.log( 'NOT AN ARRAY' );
      }
    }
  
  onMount( () => {
    loadFromStorage() || loadFromResource();
    // openSessionDialog( data() ); // this triggers an exception trying to open the dialog, somehow
    createSession( newSession => {
      data() .collectingSession .push( newSession );
      setLastOpenedSession( [ 'COLLECTION', newSession.name ] );
      updateData();
    }, alert );
  } );

  const reloadFromSource = () =>
  {
    saveDataLocally();
    loadFromResource();
  }

  const getNextId = () =>
  {
    const lastId = Number( data() .lastNumber );
    return lastId + 1;
  }

  const contextAPI = {
    selectedSpecimen, clearSelection, setSelection, openSessionDialog, openSpecimenDialog,
    lastOpenedSession, setLastOpenedSession, moveSpecimen,
  };

  const sessionName = () => lastOpenedSession()?.join('/') || '';

  return (
    <>
      <SelectionContext.Provider value={ contextAPI }>
        <div class="buttons">
          <button class="other-button" onClick={saveDataLocally}>Save</button>
          <button class="other-button" onClick={()=>openSpecimenDialog( getCollectingSession( lastOpenedSession() ) )}>New Specimen</button>
          <button class="other-button" onClick={reloadFromSource}>Load From Source</button>
        </div>
        <div class="status">
          <div>Session: {sessionName()}</div>
          <div>Last ID: {data().lastNumber}</div>
        </div>
        <div id="container">
          <div id="collection">
            <div id="picker">
              <CollectingSession session={ data() } path={[]} />
            </div>
            <div id="detail">
              <SpecimenDetails selection={ selectedSpecimen() } />
            </div>
          </div>
        </div>
        <NewSession show={!!newSessionParent()} close={saveNewSession} />
        <NewSpecimen show={!!newSpecimenParent()} close={saveNewSpecimen} nextId={getNextId} />
      </SelectionContext.Provider>
    </>
  )
}

export { App }

