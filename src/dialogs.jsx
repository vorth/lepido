
import { createSignal, createStore, For, onSettled, Show, untrack } from 'solid-js';

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
  onSettled( () => dialog.showModal() );

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

  // onSettled( () => {
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

// Every specimen field SpecimenDialog edits, in the order they're saved; on save, any of these
//  missing from the result were cleared.  'time' is included because the dialog reads it as a
//  fallback for 'date' and saves it as 'date'.
export const SPECIMEN_DIALOG_FIELDS = [ 'genus', 'species', 'date', 'time', 'latLong', 'notes',
  'temperature', 'elevation', 'collector', 'location', 'envelope', 'sex' ];

// The dialog's inputs, in display order.  latLong comes from geolocation, so it's read-only.
const SPECIMEN_INPUTS = [ 'envelope', 'genus', 'species', 'sex', 'date', 'collector', 'notes',
  'latLong', 'location', 'temperature', 'elevation' ];

// Saved even when empty; the other inputs are saved only when filled in
const ALWAYS_SAVED = new Set( [ 'genus', 'species', 'date', 'latLong' ] );

export const SpecimenDialog = ( props ) =>
{
  return (
    <Show when={props.show}>
      <SpecimenForm specimen={props.specimen} nextId={props.nextId} close={props.close} />
    </Show>
  );
}

// Created afresh each time the dialog opens, so the fields are initialized once, right here.
//  The untrack() marks these one-time reads of props and the store as deliberate.
const SpecimenForm = ( props ) =>
{
  const s = untrack( () => props.specimen );
  const editing = !!s;
  const id = untrack( () => editing ? s.id || '' : props.nextId() );
  const [ fields, setFields ] = createStore( untrack( () => {
    const initial = Object.fromEntries( SPECIMEN_INPUTS.map( name => [ name, s ?.[ name ] || '' ] ) );
    initial.date = editing ? s.time || s.date || '' : new Date() .toISOString();
    return initial;
  } ) );
  const setField = ( name, value ) => setFields( f => { f[ name ] = value; } );

  if ( ! editing ) {
    geoLocate(
      position => {
        const lat = position.coords.latitude.toFixed(5);
        const lng = position.coords.longitude.toFixed(5);
        setField( 'latLong', `${lat}, ${lng}` );
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
    const result = { id };
    SPECIMEN_DIALOG_FIELDS.forEach( name => {
      if ( name in fields && ( ALWAYS_SAVED.has( name ) || fields[ name ] ) ) {
        result[ name ] = fields[ name ];
      }
    } );
    props.close( result );
  }

  return (
    <Modal title={ `${editing ? 'Edit' : 'New'} Specimen` } titleId="specimen-dialog-title" onSave={handleSave} onClose={handleCancel}>
      <TextField id="specimen-id" label="ID" value={ id } disabled={true} />
      <For each={ SPECIMEN_INPUTS }>{ name =>
        <TextField id={ `specimen-${name}` } label={ name } value={ fields[ name ] }
          disabled={ name === 'latLong' } onChange={ value => setField( name, value ) } />
      }</For>
    </Modal>
  )
}

// Backward-compatible alias
export const NewSpecimen = SpecimenDialog;
