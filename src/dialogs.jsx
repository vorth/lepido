
import { createSignal } from 'solid-js';

import Dialog from '@suid/material/Dialog';
import DialogActions from '@suid/material/DialogActions';
import DialogContent from '@suid/material/DialogContent';
import DialogTitle from '@suid/material/DialogTitle';
import Button from '@suid/material/Button';
import TextField from '@suid/material/TextField';

let lastDate = new Date() .toISOString();
let lastTime = new Date() .toISOString();

export const NewSession = ( props ) =>
{
  const [ name, setName ] = createSignal( '' );
  const [ date, setDate ] = createSignal( lastDate );
  const changeName = (e,value) =>
  {
    setName( value );
  }
  const changeDate = (e,value) =>
  {
    setDate( value );
    lastDate = value;
  }

  const handleCancel = () =>
  {
    props.close();
  }
  const handleSave = () =>
  {
    props.close( { name: name(), time: date(), collectingSession: [], specimen: [] } );
  }

  return (
    <Dialog open={props.show} onClose={handleCancel} aria-labelledby="session-dialog-title" >
      <DialogTitle id="session-dialog-title">New Session</DialogTitle>
      <DialogContent>
        <TextField id="session-name" label="name" value={ name() } onChange={ changeName } />
        <TextField id="session-date" label="date" value={ date() } onChange={ changeDate } />
        {/* <p id="status"></p>
        <a id="map-link" target="_blank"></a> */}
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
    const [ genus, setGenus ] = createSignal( '' );
    const [ species, setSpecies ] = createSignal( '' );
    const [ time, setTime ] = createSignal( lastTime );
    const changeGenus = (e,value) => setGenus( value );
    const changeSpecies = (e,value) => setSpecies( value );
    const changeTime = (e,value) =>
    {
      setTime( value );
      lastTime = value;
    }
  
    const handleCancel = () =>
    {
      props.close();
    }
    const handleSave = () =>
    {
      props.close( { id: props.id, genus: genus(), species: species(), time: time() } );
    }
  
    return (
      <Dialog open={props.show} onClose={handleCancel} aria-labelledby="specimen-dialog-title" >
        <DialogTitle id="specimen-dialog-title">New Specimen</DialogTitle>
        <DialogContent>
          <TextField id="specimen-genus" label="genus" value={ genus() } onChange={ changeGenus } />
          <TextField id="specimen-species" label="species" value={ species() } onChange={ changeSpecies } />
          <TextField id="session-time" label="time" value={ time() } onChange={ changeTime } />
            {/* <p id="status"></p>
            <a id="map-link" target="_blank"></a> */}
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
  
  
  