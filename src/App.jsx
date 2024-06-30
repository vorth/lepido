
import { createContext, createSignal, onMount, useContext } from 'solid-js'

import './App.css'
import { saveTextFile, saveTextFileAs } from './files.js';
import { NewSession } from './dialogs.jsx';

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
        <Field key="id" value={props.specimen.id} />
        <Field key="genus" value={props.specimen.genus} />
        <Field key="species" value={props.specimen.species} />
        <Field key="time" value={props.specimen.time} />
        <Field key="place" value={props.specimen.place} />
        <Field key="location" value={props.specimen.location} />
        <Field key="latLong" value={props.specimen.latLong} />
        <Field key="notes" value={props.specimen.notes} />
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
    <button class='add-session' onClick={handleClick}>+</button>
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
            <Specimen specimen={props.session.specimen}/>
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
      <AddSession parent={props.session}/>
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
      const text = JSON.stringify( data(), null, 2 );
      if ( !!fileHandle )
        saveTextFile( fileHandle, text, 'application/json' );
      else {
        let result = saveTextFileAs( 'Lepid.json', text, 'application/json' );
        if ( result.success ) {
          fileHandle = result.fileHandle;
        }
      }
      refetch();
    }
  }

  return (
    <>
      <SelectionContext.Provider value={ { selectedSpecimen, clearSelection, setSelection, createChildSession } }>
        <div id="collection">
          <div id="picker">
            <CollectingSession session={ data() } />
          </div>
          <div id="detail">
            <SpecimenDetails specimen={ selectedSpecimen() } />
          </div>
        </div>
        <NewSession show={!!newSessionParent()} close={saveNewSession} />
      </SelectionContext.Provider>
    </>
  )
}

export { App }

