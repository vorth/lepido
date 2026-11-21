
import { createSignal, onMount, Show } from 'solid-js';

const geoLocate = ( success, error ) =>
{
  if (!navigator.geolocation) {
    alert( "Geolocation is not supported by your browser" );
  } else {
    navigator.geolocation .getCurrentPosition( success, error, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000
    } );
  }
}

export const createSession = ( success, failure ) =>
{
  const time = new Date() .toISOString();
  const name = time;
  geoLocate(
    position => {
      const lat = position.coords.latitude.toFixed(5);
      const lng = position.coords.longitude.toFixed(5);
      const latLong = `${lat}, ${lng}`;
      success( { name, time, latLong, collectingSession: [], specimen: [] } );
    },
    error => failure( 'Geolocation failed: ' + JSON.stringify( error ) )
  )
}

// A modal built on the native <dialog> element.  It opens when mounted, so render it only
//  while it should be shown; Escape and clicks on the backdrop call props.onClose.
const Modal = props =>
{
  let dialog;
  onMount( () => dialog.showModal() );

  const handleCancel = e =>
  {
    e .preventDefault(); // let the owner decide whether to close
    props.onClose();
  }
  const handleClick = e =>
  {
    if ( e.target === dialog ) { // only the backdrop; the content covers the rest of the dialog
      props.onClose();
    }
  }

  return (
    <dialog ref={dialog} class="modal" aria-labelledby={props.titleId} onCancel={handleCancel} onClick={handleClick}>
      <div class="modal-content">
        <h2 id={props.titleId} class="modal-title">{props.title}</h2>
        <div class="modal-fields">
          {props.children}
        </div>
        <div class="modal-actions">
          <button class="modal-button" onClick={props.onSave}>Save</button>
          <button class="modal-button" onClick={props.onClose}>Cancel</button>
        </div>
      </div>
    </dialog>
  );
}

const TextField = props =>
{
  return (
    <label class="dialog-field">
      <span>{props.label}</span>
      <input id={props.id} value={props.value} disabled={props.disabled}
        onInput={ e => props.onChange( e.currentTarget.value ) } />
    </label>
  );
}

export const NewSession = ( props ) =>
{
  return (
    <Show when={props.show}>
      <NewSessionForm close={props.close} />
    </Show>
  );
}

// Created afresh each time the dialog opens
const NewSessionForm = ( props ) =>
{
  const [ name, setName ] = createSignal( '' );
  const [ date, setDate ] = createSignal( '' );
  const [ latLong, setLatLong ] = createSignal( '' );

  // onMount( () => {
  //   setDate( new Date() .toISOString() );
  //   geoLocate(
  //     position => {
  //       const lat = position.coords.latitude.toFixed(5);
  //       const lng = position.coords.longitude.toFixed(5);
  //       setLatLong(`${lat}, ${lng}`);
  //       console.log(`new session geolocation: ${lat}, ${lng}`);
  //     },
  //     error => alert( 'Geolocation failed: ' + JSON.stringify( error ) )
  //   )
  // });

  const handleCancel = () =>
  {
    props.close();
  }
  const handleSave = () =>
  {
    props.close( { name: name(), time: date(), latLong: latLong(), collectingSession: [], specimen: [] } );
  }

  return (
    <Modal title="New Session" titleId="session-dialog-title" onSave={handleSave} onClose={handleCancel}>
      {/* <TextField id="session-date" label="date" value={ date() } onChange={ setDate } />
      <TextField id="session-loc"  label="latLong" value={ latLong() } disabled={true} /> */}
      <TextField id="session-name" label="name" value={ name() } onChange={ setName } />
    </Modal>
  )
}

// Every specimen field SpecimenDialog edits; on save, any of these missing from the result were cleared.
//  'time' is included because the dialog reads it as a fallback for 'date' and saves it as 'date'.
export const SPECIMEN_DIALOG_FIELDS = [ 'genus', 'species', 'date', 'time', 'latLong', 'notes',
  'temperature', 'elevation', 'collector', 'location', 'envelope', 'sex' ];

export const SpecimenDialog = ( props ) =>
{
  return (
    <Show when={props.show}>
      <SpecimenForm specimen={props.specimen} nextId={props.nextId} close={props.close} />
    </Show>
  );
}

// Created afresh each time the dialog opens, so the fields are initialized once, right here
const SpecimenForm = ( props ) =>
{
  const s = props.specimen;
  const editing = !!s;
  const [ id ] = createSignal( editing ? s.id || '' : props.nextId() );
  const [ genus, setGenus ] = createSignal( s ?.genus || '' );
  const [ species, setSpecies ] = createSignal( s ?.species || '' );
  const [ time, setTime ] = createSignal( editing ? s.time || s.date || '' : new Date() .toISOString() );
  const [ latLong, setLatLong ] = createSignal( s ?.latLong || '' );
  const [ notes, setNotes ] = createSignal( s ?.notes || '' );
  const [ temperature, setTemperature ] = createSignal( s ?.temperature || '' );
  const [ elevation, setElevation ] = createSignal( s ?.elevation || '' );
  const [ collector, setCollector ] = createSignal( s ?.collector || '' );
  const [ location, setLocation ] = createSignal( s ?.location || '' );
  const [ envelope, setEnvelope ] = createSignal( s ?.envelope || '' );
  const [ sex, setSex ] = createSignal( s ?.sex || '' );

  if ( ! editing ) {
    geoLocate(
      position => {
        const lat = position.coords.latitude.toFixed(5);
        const lng = position.coords.longitude.toFixed(5);
        setLatLong( `${lat}, ${lng}` );
        console.log(`new specimen geolocation: ${lat}, ${lng}`);
      },
      error => alert( 'Geolocation failed, probably not HTTPS ' + JSON.stringify( error ) )
    )
  }

  const handleCancel = () =>
  {
    props.close();
  }
  const handleSave = () =>
  {
    const result = { id: id(), genus: genus(), species: species(), date: time(), latLong: latLong() };
    if ( notes() ) result.notes = notes();
    if ( temperature() ) result.temperature = temperature();
    if ( elevation() ) result.elevation = elevation();
    if ( collector() ) result.collector = collector();
    if ( location() ) result.location = location();
    if ( envelope() ) result.envelope = envelope();
    if ( sex() ) result.sex = sex();
    props.close( result );
  }

  return (
    <Modal title={ `${editing ? 'Edit' : 'New'} Specimen` } titleId="specimen-dialog-title" onSave={handleSave} onClose={handleCancel}>
      <TextField id="specimen-id" label="ID" value={ id() } disabled={true} />
      <TextField id="specimen-envelope" label="envelope" value={ envelope() } onChange={ setEnvelope } />
      <TextField id="specimen-genus" label="genus" value={ genus() } onChange={ setGenus } />
      <TextField id="specimen-species" label="species" value={ species() } onChange={ setSpecies } />
      <TextField id="specimen-sex" label="sex" value={ sex() } onChange={ setSex } />
      <TextField id="specimen-time" label="date" value={ time() } onChange={ setTime } />
      <TextField id="specimen-collector" label="collector" value={ collector() } onChange={ setCollector } />
      <TextField id="specimen-notes" label="notes" value={ notes() } onChange={ setNotes } />
      <TextField id="specimen-loc"  label="latLong" value={ latLong() } disabled={true} />
      <TextField id="specimen-location" label="location" value={ location() } onChange={ setLocation } />
      <TextField id="specimen-temperature" label="temperature" value={ temperature() } onChange={ setTemperature } />
      <TextField id="specimen-elevation" label="elevation" value={ elevation() } onChange={ setElevation } />
    </Modal>
  )
}

// Backward-compatible alias
export const NewSpecimen = SpecimenDialog;
