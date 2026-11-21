
import { For, Show } from 'solid-js';

import { Specimen } from './specimen.jsx';
import { sessionLabel } from '../model.js';
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
  const { isExpanded, toggleSession } = useSelection();
  const name = () => sessionLabel( props.session );
  const expanded = () => isExpanded( props.session.id );

  const toggleCollapsed = e =>
  {
    e .stopPropagation();
    toggleSession( props.session.id );
  }

  return (
    <div class="session" onClick={ toggleCollapsed }>
      <span class="session-name">{name()}</span>
      <div class="session-collapsible" classList={{'session-expanded': expanded()}}>
        <div class="session-collapsible-inner">
          <ul class='sessionList'>
            <For each={props.session.specimen}>{ (specimen) =>
              <Specimen specimen={specimen} container={props.session}/>
            }</For>
            <For each={props.session.collectingSession}>{ session =>
              <li>
                <CollectingSession session={ session } />
              </li>
            }</For>
          </ul>
          <Show when={ mode() !== VIEWING }>
            <Show when={ mode() === LABELING } fallback={
              <>
                <AddSession parent={props.session.id}/>
                <AddSpecimen parent={props.session.id} />
                <ImportSpecimens parent={props.session.id} />
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
