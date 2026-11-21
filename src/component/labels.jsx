import { For, Show, untrack } from 'solid-js';

import { useSelection } from '../context/selection.jsx';
import { useData } from './data.jsx';
import { locationText } from '../model.js';

const SpecimenLabel = props =>
{
  const { data } = useData();
  // Tracks the specimen's own location, but not the lookup in the shared locations table,
  //  which every label would otherwise subscribe to.
  const location = () =>
  {
    const own = props.specimen.location;
    return untrack( () => locationText( own, data.locations ) );
  }

  return (
    <div class="single-label">
      <div class="label-locality">
        <span>{location()}</span>
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
        <span class="label-taxon">{props.specimen.genus} {props.specimen.species}</span>
        <span class="label-id">{props.specimen.id}</span>
      </div>
      <div class="label-taxonomy">
        <span class="label-id">{props.specimen.envelope}</span>
      </div>
    </div>
  );
}

const exportCSV = ( specimens ) =>
{
  const header = 'description,name,latitude,longitude,date';
  const rows = specimens.map( s => {
    const description = `${s.genus || ''} ${s.species || ''}`.trim();
    const name = `${s.id || ''} ${s.genus || ''}`.trim();
    const [lat, lon] = (s.latLong || '').split(',').map(v => v.trim());
    const date = s.date || s.time || '';
    return [description, name, lat || '', lon || '', date]
      .map( v => `"${String(v).replace(/"/g, '""')}"` )
      .join(',');
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'specimens.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export const LabelsPanel = () =>
{
  const { labelSpecimens, clearLabelSelection, labelCount } = useSelection();

  const handlePrint = () => window.print();
  const handleExportCSV = () => exportCSV( labelSpecimens() );

  return (
    <div id="labels-panel">
      <div class="labels-toolbar no-print">
        <span>{labelCount()} specimen{labelCount() !== 1 ? 's' : ''} selected</span>
        <button class="other-button" onClick={handlePrint} disabled={labelCount() === 0}>Print Labels</button>
        <button class="other-button" onClick={handleExportCSV} disabled={labelCount() === 0}>Export CSV</button>
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
