import { createRenderEffect, For, Show, useContext } from 'solid-js';

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
  const { lastOpenedSession, moveSpecimen } = useEditor();
  const { selectedSpecimen } = useSelection();
  const { mode } = useMode();
  const handleMove = () => moveSpecimen( specimen() );

  return (
    <Show when={ !! selectedSpecimen() .specimen }>
      <div id="selectedSpecimen" >
        <For each={ Object.entries( selectedSpecimen() .specimen ) } >{ ( [key, value] ) =>
          <Field key={key} value={value} />
        }</For>
      </div>
      {( (mode() === CURATING) && !! lastOpenedSession() ) &&  <button class='move-button' onClick={handleMove}>Move to {lastOpenedSession().join('/')}</button>}
    </Show>
  );
}

