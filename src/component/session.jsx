
import { createSignal, createEffect, For, Show, batch } from 'solid-js';

import { Specimen } from './specimen.jsx';
import { useMode, VIEWING } from '../context/mode.jsx';
import { useSelection } from '../context/selection.jsx';
import { useEditor } from '../context/editor.jsx';

const AddSession = props =>
{
  const { openSessionDialog } = useEditor();
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
  const { openSpecimenDialog } = useEditor();
  const handleClick = e =>
  {
    e .stopPropagation();
    openSpecimenDialog( props.parent );
  }

  return (
    <button class='add-specimen add-button' onClick={handleClick}>+</button>
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
    <button class='import-specimens add-button' onClick={handleClick}>+</button>
  );
}

export const CollectingSession = props =>
{
  const { mode } = useMode();
  const { setSelectedId, selectedSpecimen } = useSelection();
  const { lastOpenedSession, setLastOpenedSession } = useEditor();
  const [ specimensCollapsed, setSpecimensCollapsed ] = createSignal( true );
  const [ sessionsCollapsed, setSessionsCollapsed ] = createSignal( false );
  const name = () => props.session.name || 'COLLECTION';
  const path = () => [ ...props.path, name() ];

  createEffect( () => {
    if ( selectedSpecimen() ?.container === props.session ) {
      setSpecimensCollapsed( false );
    }
    if ( lastOpenedSession() ?.join('/') === path().join('/') ) {
      setSpecimensCollapsed( false );
    }
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
      {name()}
      <ul class='sessionList'>
        <Show when={ !specimensCollapsed() }>
          <Show when={ Array.isArray( props.session.specimen ) } fallback={
            props.session.specimen && <Specimen specimen={props.session.specimen} container={props.session} />
          }>
            <For each={props.session.specimen}>{ (specimen) =>
              <Specimen specimen={specimen} container={props.session}/>
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
      <Show when= { mode() !== VIEWING } >
        <Show when={ !specimensCollapsed() } fallback={
          <AddSession parent={props.session}/>
        }>
          <AddSpecimen parent={props.session} />
          <ImportSpecimens parent={props.session} />
        </Show>
      </Show>
    </div>
  );
}
