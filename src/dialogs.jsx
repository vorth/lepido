
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
  const [ date, setDate ] = createSignal( new Date() .toISOString() );
  const [ latLong, setLatLong ] = createSignal( '' );
  const changeName = (e,value) =>
  {
    setName( value );
  }
  const changeDate = (e,value) =>
  {
    setDate( value );
  }

  createEffect( () => {
    if ( props.show ) {
      setDate( new Date() .toISOString() );
      geoLocate(
        position => {
          const lat = position.coords.latitude.toFixed(5);
          const lng = position.coords.longitude.toFixed(5);
          setLatLong(`${lat}, ${lng}`);
          console.log(`new session geolocation: ${lat}, ${lng}`);          
        },
        error => alert( 'Geolocation failed: ' + JSON.stringify( error ) )
      )
    }
  });

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
        <TextField class="dialog-input" id="session-name" label="name" value={ name() } onChange={ changeName } />
        <TextField class="dialog-input" id="session-date" label="date" value={ date() } onChange={ changeDate } />
        <TextField class="dialog-input" id="session-loc"  label="latLong" value={ latLong() } disabled={true} />
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

export const NewSpecimen = ( props ) =>
{
  const [ id, setId ] = createSignal( '' );
  const [ genus, setGenus ] = createSignal( '' );
  const [ species, setSpecies ] = createSignal( '' );
  const [ time, setTime ] = createSignal( new Date() .toISOString() );
  const [ latLong, setLatLong ] = createSignal( '' );
  const changeGenus = (e,value) => setGenus( value );
  const changeSpecies = (e,value) => setSpecies( value );
  const changeTime = (e,value) =>
  {
    setTime( value );
  }

  createEffect( () => {
    if ( props.show ) {
      setId( props.nextId() );
      setTime( new Date() .toISOString() );
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
  });

  const handleCancel = () =>
  {
    props.close();
  }
  const handleSave = () =>
  {
    props.close( { id: id(), genus: genus(), species: species(), time: time(), latLong: latLong() } );
  }

  return (
    <Dialog open={props.show} onClose={handleCancel} aria-labelledby="specimen-dialog-title" >
      <DialogTitle id="specimen-dialog-title">New Specimen</DialogTitle>
      <DialogContent>
        <TextField class="dialog-input" id="specimen-id" label="ID" value={ id() } disabled={true} />
        <TextField class="dialog-input" id="specimen-genus" label="genus" value={ genus() } onChange={ changeGenus } />
        <TextField class="dialog-input" id="specimen-species" label="species" value={ species() } onChange={ changeSpecies } />
        <TextField class="dialog-input" id="specimen-time" label="time" value={ time() } onChange={ changeTime } />
        <TextField class="dialog-input" id="specimen-loc"  label="latLong" value={ latLong() } disabled={true} />
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
