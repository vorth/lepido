
import { createSignal, createEffect } from 'solid-js';

import Dialog from '@suid/material/Dialog';
import DialogActions from '@suid/material/DialogActions';
import DialogContent from '@suid/material/DialogContent';
import DialogTitle from '@suid/material/DialogTitle';
import Button from '@suid/material/Button';
import TextField from '@suid/material/TextField';

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

export const NewSession = ( props ) =>
{
  const [ name, setName ] = createSignal( '' );
  const [ date, setDate ] = createSignal( '' );
  const [ latLong, setLatLong ] = createSignal( '' );
  const changeName = (e,value) =>
  {
    setName( value );
  }
  const changeDate = (e,value) =>
  {
    setDate( value );
  }

  // createEffect( () => {
  //   if ( props.show ) {
  //     setDate( new Date() .toISOString() );
  //     geoLocate(
  //       position => {
  //         const lat = position.coords.latitude.toFixed(5);
  //         const lng = position.coords.longitude.toFixed(5);
  //         setLatLong(`${lat}, ${lng}`);
  //         console.log(`new session geolocation: ${lat}, ${lng}`);          
  //       },
  //       error => alert( 'Geolocation failed: ' + JSON.stringify( error ) )
  //     )
  //   }
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
    <Dialog open={props.show} onClose={handleCancel} aria-labelledby="session-dialog-title" >
      <DialogTitle id="session-dialog-title">New Session</DialogTitle>
      <DialogContent>
        {/* <TextField class="dialog-input" style="margin: 6px;" id="session-date" label="date" value={ date() } onChange={ changeDate } />
        <TextField class="dialog-input" style="margin: 6px;" id="session-loc"  label="latLong" value={ latLong() } disabled={true} /> */}
        <TextField class="dialog-input" style="margin: 6px;" id="session-name" label="name" value={ name() } onChange={ changeName } />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSave} color="secondary">
          Save
        </Button>
        <Button onClick={handleCancel} color="primary">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
} 

export const SpecimenDialog = ( props ) =>
{
  const editing = () => !!props.specimen;
  const [ id, setId ] = createSignal( '' );
  const [ genus, setGenus ] = createSignal( '' );
  const [ species, setSpecies ] = createSignal( '' );
  const [ time, setTime ] = createSignal( '' );
  const [ latLong, setLatLong ] = createSignal( '' );
  const [ notes, setNotes ] = createSignal( '' );
  const [ temperature, setTemperature ] = createSignal( '' );
  const [ elevation, setElevation ] = createSignal( '' );
  const [ collector, setCollector ] = createSignal( '' );
  const [ location, setLocation ] = createSignal( '' );
  const [ envelope, setEnvelope ] = createSignal( '' );
  const [ sex, setSex ] = createSignal( '' );
  const changeGenus = (e,value) => setGenus( value );
  const changeSpecies = (e,value) => setSpecies( value );
  const changeTime = (e,value) => setTime( value );
  const changeNotes = (e,value) => setNotes( value );
  const changeTemperature = (e,value) => setTemperature( value );
  const changeElevation = (e,value) => setElevation( value );
  const changeCollector = (e,value) => setCollector( value );
  const changeLocation = (e,value) => setLocation( value );
  const changeEnvelope = (e,value) => setEnvelope( value );
  const changeSex = (e,value) => setSex( value );

  createEffect( () => {
    if ( props.show ) {
      if ( editing() ) {
        const s = props.specimen;
        setId( s.id || '' );
        setGenus( s.genus || '' );
        setSpecies( s.species || '' );
        setTime( s.time || s.date || '' );
        setLatLong( s.latLong || '' );
        setNotes( s.notes || '' );
        setTemperature( s.temperature || '' );
        setElevation( s.elevation || '' );
        setCollector( s.collector || '' );
        setLocation( s.location || '' );
        setEnvelope( s.envelope || '' );
        setSex( s.sex || '' );
      } else {
        setId( props.nextId() );
        setGenus( '' );
        setSpecies( '' );
        setTime( new Date() .toISOString() );
        setNotes( '' );
        setTemperature( '' );
        setElevation( '' );
        setCollector( '' );
        setLocation( '' );
        setEnvelope( '' );
        setSex( '' );
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
    }
  });

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
    <Dialog open={props.show} onClose={handleCancel} aria-labelledby="specimen-dialog-title" >
      <DialogTitle id="specimen-dialog-title">{editing() ? 'Edit' : 'New'} Specimen</DialogTitle>
      <DialogContent>
        <TextField class="dialog-input" style="margin: 6px;" id="specimen-id" label="ID" value={ id() } disabled={true} />
        <TextField class="dialog-input" style="margin: 6px;" id="specimen-envelope" label="envelope" value={ envelope() } onChange={ changeEnvelope } />
        <TextField class="dialog-input" style="margin: 6px;" id="specimen-genus" label="genus" value={ genus() } onChange={ changeGenus } />
        <TextField class="dialog-input" style="margin: 6px;" id="specimen-species" label="species" value={ species() } onChange={ changeSpecies } />
        <TextField class="dialog-input" style="margin: 6px;" id="specimen-sex" label="sex" value={ sex() } onChange={ changeSex } />
        <TextField class="dialog-input" style="margin: 6px;" id="specimen-time" label="date" value={ time() } onChange={ changeTime } />
        <TextField class="dialog-input" style="margin: 6px;" id="specimen-collector" label="collector" value={ collector() } onChange={ changeCollector } />
        <TextField class="dialog-input" style="margin: 6px;" id="specimen-notes" label="notes" value={ notes() } onChange={ changeNotes } />
        <TextField class="dialog-input" style="margin: 6px;" id="specimen-loc"  label="latLong" value={ latLong() } disabled={true} />
        <TextField class="dialog-input" style="margin: 6px;" id="specimen-location" label="location" value={ location() } onChange={ changeLocation } />
        <TextField class="dialog-input" style="margin: 6px;" id="specimen-temperature" label="temperature" value={ temperature() } onChange={ changeTemperature } />
        <TextField class="dialog-input" style="margin: 6px;" id="specimen-elevation" label="elevation" value={ elevation() } onChange={ changeElevation } />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSave} color="secondary">
          Save
        </Button>
        <Button onClick={handleCancel} color="primary">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// Backward-compatible alias
export const NewSpecimen = SpecimenDialog;
