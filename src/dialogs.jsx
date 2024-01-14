
import { createSignal } from 'solid-js';

import Dialog from '@suid/material/Dialog';
import DialogActions from '@suid/material/DialogActions';
import DialogContent from '@suid/material/DialogContent';
import DialogTitle from '@suid/material/DialogTitle';
import Button from '@suid/material/Button';
import TextField from '@suid/material/TextField';

let lastTime = '';

export const NewSession = ( props ) =>
{
  const [ name, setName ] = createSignal( '' );
  const [ time, setTime ] = createSignal( lastTime );
  const changeName = (e,value) =>
  {
    setName( value );
  }
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
    props.close( { name: name(), time: time(), collectingSession: [], specimen: [] } );
  }

  return (
    <Dialog open={props.show} onClose={handleCancel} aria-labelledby="form-dialog-title" >
      <DialogTitle id="form-dialog-title">New Session</DialogTitle>
      <DialogContent>
        <TextField id="session-name" label="name" value={ name() } onChange={ changeName } />
        <TextField id="session-time" label="time" value={ time() } onChange={ changeTime } />
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


