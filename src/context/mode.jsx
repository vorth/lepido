
import { createContext, createSignal, useContext } from "solid-js";

const VIEWING = 0;
const CURATING = 1;
const LABELING = 2;
export { VIEWING, CURATING, LABELING };

// Curating and labeling are only useful to the collection's owner, so they're exposed only when
//  this key is present in local storage.  Not a real secret; it just keeps public visitors from
//  wandering into irrelevant features.  Enable with: localStorage.setItem( 'lepido-curator', 'true' )
const CURATOR_KEY = 'lepido-curator';

const isCurator = () =>
{
  try {
    return localStorage .getItem( CURATOR_KEY ) !== null;
  } catch ( e ) {
    return false;
  }
}

const ModeContext = createContext( { mode: () => VIEWING, canCurate: false } );

const ModeProvider = (props) =>
{
  const canCurate = isCurator();
  const [ mode, setModeSignal ] = createSignal( VIEWING );
  const setMode = newMode => canCurate && setModeSignal( newMode );

  return (
    <ModeContext value={{ mode, setMode, canCurate }}>
      {props.children}
    </ModeContext>
  );
}

const useMode = () => {
  const context = useContext( ModeContext );
  if (!context) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return context;
}

export { useMode, ModeProvider };