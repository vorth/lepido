import { For, Show } from 'solid-js';

import { CURATING, useMode } from '../context/mode.jsx';
import { useSelection } from '../context/selection.jsx';
import { useEditor } from '../context/editor.jsx';

export const Field = props =>
{
  return (
    <div>
      {`${props.key}: ${props.value || ''}`}
    </div>
  );
}

export const SpecimenDetails = props =>
{
  const { moveSpecimen, openEditSpecimenDialog } = useEditor();
  const { selectedSpecimen, lastOpenedSession, lastOpenedSessionName } = useSelection();
  const { mode } = useMode();
  const handleMove = () => moveSpecimen( specimen().id );
  const handleEdit = () => openEditSpecimenDialog( selectedSpecimen().specimen );

  const specimen = () => selectedSpecimen()?.specimen;
  const entries = () => specimen() ? Object.entries( specimen() ) : [];

  return (
    <div class={[ 'detail-collapsible', { 'detail-expanded': !!specimen() } ]}>
      <div class="detail-collapsible-inner">
        <div id="selectedSpecimen" >
          <For each={ entries() } >{ ( [key, value] ) =>
            <Field key={key} value={value} />
          }</For>
        </div>
        <Show when={ mode() === CURATING && specimen() }>
          <button class='edit-button' onClick={handleEdit}>Edit</button>
        </Show>
        <Show when={ mode() === CURATING && specimen() && lastOpenedSession() }>
          <button class='move-button' onClick={handleMove}>Move to {lastOpenedSessionName()}</button>
        </Show>
      </div>
    </div>
  );
}

