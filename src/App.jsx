
import { createContext, createSignal, mergeProps, onMount, useContext } from 'solid-js'

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
    setSelection( props.specimen );
  }

  return (
    <li id={`id-${props.specimen.id}`} class='specimen' onClick={clickHandler} classList={ { selected: selectedSpecimen()?.id === props.specimen.id } } >
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
  return (
    <Show when={ !! props.specimen }>
      <div id="selectedSpecimen" >
        <For each={ Object.entries( props.specimen ) } >{ ( [key, value] ) =>
          <Field key={key} value={value} />
        }</For>
      </div>
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
  const { clearSelection } = useContext( SelectionContext );
  const [ specimensCollapsed, setSpecimensCollapsed ] = createSignal( true );
  const [ sessionsCollapsed, setSessionsCollapsed ] = createSignal( false );

  const toggleCollapsed = e =>
  {
    e .stopPropagation();
    setSpecimensCollapsed( val => !val );
    clearSelection();
  }

  return (
    <div class="session" onClick={ toggleCollapsed }>
      {props.session.name || 'COLLECTION'}
      <ul class='sessionList'>
        <Show when={ !specimensCollapsed() }>
          <Show when={ Array.isArray( props.session.specimen ) } fallback={
            props.session.specimen && <Specimen specimen={props.session.specimen}/>
          }>
            <For each={props.session.specimen}>{ specimen =>
              <Specimen specimen={specimen}/>
            }</For>
          </Show>
        </Show>
        <Show when={ !sessionsCollapsed() }>
          <For each={props.session.collectingSession}>{ session =>
            <li>
              <CollectingSession session={ session } parent={ props.session } />
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
  const refetch = () =>
  {
    fetch( './Lepid.json' )
      .then( response => response.text() )
      .then( text => setData( JSON.parse( text ) ) );
  }
  onMount( refetch );

  const [ selectedSpecimen, setSelectedSpecimen ] = createSignal( null );
  const clearSelection = () => setSelectedSpecimen( null );
  const setSelection = selection =>
  {
    if ( selection ?.id === selectedSpecimen() ?.id )
      setSelectedSpecimen( null );
    else
      setSelectedSpecimen( selection );
  }

  const updateData = () =>
  {
    const text = JSON.stringify( data(), null, 2 );
    setData( JSON.parse( text ) );
  }

  const saveDataLocally = () =>
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
    // This assumes we are running the app from source, on my computer,
    //   and we just saved over the Lepid.json source.
    refetch();
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
  const contextAPI = {
    selectedSpecimen, clearSelection, setSelection, createChildSession, createSpecimen
  };

  return (
    <>
      <SelectionContext.Provider value={ contextAPI }>
        <div id="collection">
          <div id="picker">
            <CollectingSession session={ data() } />
          </div>
          <div id="detail">
            <SpecimenDetails specimen={ selectedSpecimen() } />
          </div>
        </div>
        <NewSession show={!!newSessionParent()} close={saveNewSession} />
        <NewSpecimen show={!!newSpecimenParent()} close={saveNewSpecimen} />
      </SelectionContext.Provider>
    </>
  )
}

export { App }

