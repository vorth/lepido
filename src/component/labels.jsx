import { For, Show } from 'solid-js';

import { useSelection } from '../context/selection.jsx';
import { useData } from './data.jsx';

const resolveLocationRef = ( locations, ref ) =>
{
  if ( !locations || !ref ) return null;
  const parts = ref.split('/');
  let locs = Array.isArray( locations.location ) ? locations.location
    : locations.location ? [ locations.location ] : [];
  let resolved = null;
  for ( const part of parts ) {
    resolved = locs.find( l => l.name === part );
    if ( !resolved ) return null;
    locs = Array.isArray( resolved.location ) ? resolved.location
      : resolved.location ? [ resolved.location ] : [];
  }
  return resolved;
}

const formatLocation = ( location, locations ) =>
{
  if ( !location ) return '';
  if ( location.ref ) {
    const resolved = resolveLocationRef( locations, location.ref );
    if ( resolved ) {
      const place = typeof resolved.place === 'object' ? resolved.place['#text'] : resolved.place;
      const latLong = typeof resolved.place === 'object'
        ? resolved.place.latLong
        : resolved.latLong;
      return [ place, latLong ].filter(Boolean).join('; ');
    }
    return location.ref;
  }
  if ( location.place ) {
    const place = typeof location.place === 'object' ? location.place['#text'] : location.place;
    return [ place, location.latLong ].filter(Boolean).join('; ');
  }
  return location.latLong || '';
}

const SpecimenLabel = props =>
{
  return (
    <div class="single-label">
      <div class="label-locality">
        <span>{props.specimen.location}</span>
        <span>{props.specimen.latLong}</span>
        <span>{props.specimen.date}</span>
        <span>
          {props.specimen.temperature}, {props.specimen.elevation || ""}
        </span>
        <span>{props.specimen.collector}</span>
      </div>
      <Show when={props.specimen.notes}>
        <div class="label-notes">
          <span>{props.specimen.notes}</span>
        </div>
      </Show>
      <div class="label-taxonomy">
        <span class="label-id">{props.specimen.id}</span>
      </div>
    </div>
  );
}

export const LabelsPanel = () =>
{
  const { labelSpecimens, clearLabelSelection, labelSelection } = useSelection();

  const handlePrint = () => window.print();

  return (
    <div id="labels-panel">
      <div class="labels-toolbar no-print">
        <span>{labelSelection().size} specimen{labelSelection().size !== 1 ? 's' : ''} selected</span>
        <button class="other-button" onClick={handlePrint} disabled={labelSelection().size === 0}>Print Labels</button>
        <button class="other-button" onClick={clearLabelSelection}>Clear Selection</button>
      </div>
      <div class="label-output" id="label-output">
        <For each={labelSpecimens()}>{ specimen =>
          <SpecimenLabel specimen={specimen} />
        }</For>
      </div>
    </div>
  );
}
