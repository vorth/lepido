import { For, Show } from 'solid-js';

import { CURATING, useMode } from '../context/mode.jsx';
import { useSelection } from '../context/selection.jsx';
import { useEditor } from '../context/editor.jsx';

export const Field = props =>
{
  return (
    <tr>
      <th scope="row">{props.key}</th>
      <td>{props.value || ''}</td>
    </tr>
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
  // Field names, not [key, value] pairs: strings keep their identity across re-runs, so <For>
  //  reuses each row, and each row reads its own value from the store.
  // Genus and species display together as a single "taxon" row, where the first of them appears.
  const fieldNames = () => {
    if ( !specimen() ) return [];
    const names = [];
    for ( const key of Object.keys( specimen() ) ) {
      const name = ( key === 'genus' || key === 'species' ) ? 'taxon' : key;
      if ( !names.includes( name ) ) names.push( name );
    }
    return names;
  };
  const fieldValue = key => key === 'taxon'
    ? `${specimen()?.genus ?? ''} ${specimen()?.species ?? ''}`.trim()
    : specimen()?.[key];

  return (
    <div class={[ 'detail-collapsible', { 'detail-expanded': !!specimen() } ]}>
      <div class="detail-collapsible-inner">
        <div id="selectedSpecimen" >
          <table class="specimen-fields">
            <tbody>
              <For each={ fieldNames() } >{ key =>
                <Field key={key} value={fieldValue( key )} />
              }</For>
            </tbody>
          </table>
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

