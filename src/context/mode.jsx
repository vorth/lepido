
import { createContext, createSignal, useContext } from "solid-js";

const VIEWING = 0;
const CURATING = 1;
export { VIEWING, CURATING };

const ModeContext = createContext( { mode: () => VIEWING } );

const ModeProvider = (props) =>
{
  const [ mode, setMode ] = createSignal( VIEWING );

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {props.children}
    </ModeContext.Provider>
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