
import { createSignal, createEffect, For, Show, batch } from 'solid-js';

const collapsedState = new Map();
const getCollapsed = (key) => collapsedState.has(key) ? collapsedState.get(key) : true;
const setCollapsed = (key, val) => collapsedState.set(key, val);

import { Specimen } from './specimen.jsx';
import { useMode, VIEWING, LABELING } from '../context/mode.jsx';
import { useSelection } from '../context/selection.jsx';
import { useEditor } from '../context/editor.jsx';

const ToggleLabels = props =>
{
  const { labelSelection, toggleLabelSelection, collectAllSpecimens } = useSelection();
  const handleClick = e =>
  {
    e .stopPropagation();
    // recursively toggle all specimens in this session.  If any specimen is not selected, select all.  If all are selected, deselect all.
    const specimens = props.session ? collectAllSpecimens( props.session ) : [];
    const allSelected = specimens.every( s => labelSelection().has( s.id ) );
    if ( allSelected ) {
      specimens.forEach( s => toggleLabelSelection( s.id, false ) );
    } else {
      specimens.forEach( s => toggleLabelSelection( s.id, true ) );
    }
  }

  return (
    <button class='toggle-labels add-button' onClick={handleClick}>toggle labels</button>
  );
}

const AddSession = props =>
{
  const { openSessionDialog } = useEditor();
  const handleClick = e =>
  {
    e .stopPropagation();
    openSessionDialog( props.parent );
  }

  return (
    <button class='add-session add-button' onClick={handleClick}>add session</button>
  );
}

const AddSpecimen = props =>
{
  const { openSpecimenDialog } = useEditor();
  const handleClick = e =>
  {
    e .stopPropagation();
    openSpecimenDialog( props.parent );
  }

  return (
    <button class='add-specimen add-button' onClick={handleClick}>add specimen</button>
  );
}

const ImportSpecimens = props =>
{
  const { importSpecimens } = useEditor();
  const handleClick = e =>
  {
    e .stopPropagation();
    importSpecimens( props.parent );
  }

  return (
    <button class='import-specimens add-button' onClick={handleClick}>import JSON</button>
  );
}

export const CollectingSession = props =>
{
  const { mode } = useMode();
  const { setSelectedId, selectedSpecimen } = useSelection();
  const { lastOpenedSession, setLastOpenedSession } = useEditor();
  const name = () => props.session.name || 'COLLECTION';
  const path = () => [ ...props.path, name() ];
  const pathKey = () => path().join('/');
  const [ specimensCollapsed, setSpecimensCollapsed ] = createSignal( getCollapsed( pathKey() ) );

  createEffect( () => {
    if ( selectedSpecimen() ?.container === props.session ) {
      setSpecimensCollapsed( false );
    }
    if ( lastOpenedSession() ?.join('/') === pathKey() ) {
      setSpecimensCollapsed( false );
    }
  } );

  createEffect( () => {
    setCollapsed( pathKey(), specimensCollapsed() );
  } );

  const toggleCollapsed = e =>
  {
    e .stopPropagation();
    const wasCollapsed = specimensCollapsed();
    batch( () => {
      setSpecimensCollapsed( val => !val );
      if ( wasCollapsed ) {
        // opening specimens of this session
        console.log( `destination is ${JSON.stringify(path())}`);
        setLastOpenedSession( path() );
      }
      setSelectedId( null );
    } );
  }

  return (
    <div class="session" onClick={ toggleCollapsed }>
      <span class="session-name">{name()}</span>
      <div class="session-collapsible" classList={{'session-expanded': !specimensCollapsed()}}>
        <div class="session-collapsible-inner">
          <ul class='sessionList'>
            <Show when={ Array.isArray( props.session.specimen ) } fallback={
              props.session.specimen && <Specimen specimen={props.session.specimen} container={props.session} />
            }>
              <For each={props.session.specimen}>{ (specimen) =>
                <Specimen specimen={specimen} container={props.session}/>
              }</For>
            </Show>
            <For each={props.session.collectingSession}>{ session =>
              <li>
                <CollectingSession session={ session } path={path()} />
              </li>
            }</For>
          </ul>
          <Show when={ mode() !== VIEWING }>
            <Show when={ mode() === LABELING } fallback={
              <>
                <AddSession parent={props.session}/>
                <AddSpecimen parent={props.session} />
                <ImportSpecimens parent={props.session} />
              </>
            }>
              <ToggleLabels session={props.session} />
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
}
