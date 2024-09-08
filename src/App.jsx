
import { createContext, createSignal, onMount, useContext } from 'solid-js'

import './App.css'
import { saveTextFile, saveTextFileAs } from './files.js';
import { NewSession, NewSpecimen } from './dialogs.jsx';

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
  const { createChildSession } = useContext( SelectionContext );
  const handleClick = e =>
  {
    e .stopPropagation();
    createChildSession( props.parent );
  }

  return (
    <button class='add-session add-button' onClick={handleClick}>+</button>
  );
}


const AddSpecimen = props =>
  {
    const { createSpecimen } = useContext( SelectionContext );
    const handleClick = e =>
    {
      e .stopPropagation();
      createSpecimen( props.parent );
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
        <AddSpecimen parent={props.session}/>
      </Show>
    </div>
  );
}

const SelectionContext = createContext( null );

let fileHandle = null;

const App = () =>
{
  const [ data, setData ] = createSignal( {} );

  const loadFromResource = () =>
  {
    fetch( './Lepid.json' )
      .then( response => response.text() )
      .then( text => setData( JSON.parse( text ) ) );
  }

  const loadFromStorage = () =>
  {
    const stored = localStorage .getItem( 'lepido' );
    if ( !! stored ) {
      setData( JSON.parse( stored ) );
      return true;
    }
    else
      return false;
  }

  onMount( () => loadFromStorage() || loadFromResource() );

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
      let result = saveTextFileAs( 'Lepid-new.json', text, 'application/json' );
      if ( result.success ) {
        fileHandle = result.fileHandle;
      }
    }
    // This assumes we are running the app from source, on my computer,
    //   and we just saved over the Lepid.json source... and why is it even necessary?
    // refetch();
  }

  const [ newSessionParent, setNewSessionParent ] = createSignal( null );
  const createChildSession = parent =>
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
  }

  const [ newSpecimenParent, setNewSpecimenParent ] = createSignal( null );
  const createSpecimen = parent =>
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

  const [ lastOpenedSession, setLastOpenedSession ] = createSignal();
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
    
  const contextAPI = {
    selectedSpecimen, clearSelection, setSelection, createChildSession, createSpecimen,
    lastOpenedSession, setLastOpenedSession, moveSpecimen,
  };

  return (
    <>
      <SelectionContext.Provider value={ contextAPI }>
        <div class="buttons">
          <button class="other-button" onClick={saveDataLocally}>Save</button>
          <button class="other-button" onClick={loadFromStorage}>Load From Storage</button>
          <button class="other-button" onClick={loadFromResource}>Load From Source</button>
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
        <NewSpecimen show={!!newSpecimenParent()} close={saveNewSpecimen} />
      </SelectionContext.Provider>
    </>
  )
}

export { App }

