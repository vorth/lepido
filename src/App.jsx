
import { onMount, Show, useContext } from 'solid-js'

import './App.css'
import { NewSession, NewSpecimen } from './dialogs.jsx';
import { CollectingSession } from './component/session.jsx';
import { SpecimenDetails } from './component/details.jsx';
import { COLLECTING, CURATING, ModeProvider, VIEWING, useMode } from './context/mode.jsx';
import { SelectionProvider, useSelection } from './context/selection.jsx';
import { EditorProvider, useEditor } from './context/editor.jsx';
import { DataProvider, useData } from './component/data.jsx';


const queryParams = new URLSearchParams( window.location.search );
const specimenID = queryParams.get( 'id' );

const AppUI = () =>
{
  const { mode, setMode } = useMode();
  const { setSelectedId } = useSelection();
  const { data, localData, sourceData, loadStorage,
    loadFromResource, loadFromStorage, saveDataLocally, backUpFile } = useData();
  const {
    newSessionParent, saveNewSession, newSpecimenParent, saveNewSpecimen, getNextId,
    lastOpenedSession } = useEditor();

  const sessionName = () => (lastOpenedSession && lastOpenedSession()?.join('/')) || '';
  
  onMount( () => {
    loadStorage();
    if ( mode() === VIEWING ) {
      loadFromResource() .then( () => {
        if ( !! specimenID ) {
          setSelectedId( specimenID );
        }
      } );
    }

    // if ( mode() === COLLECTING ) {
    //   setTimeout(() => {
    //     openSessionDialog( data() ); 
    //   });
    // }
  } );

  return (
    <>
      <div class="mode-buttons">
        <button class={`mode-button ${mode() === VIEWING ? 'active-mode' : ''}`} onClick={()=>setMode(VIEWING)}>VIEW</button>
        <button class={`mode-button ${mode() === CURATING ? 'active-mode' : ''}`} onClick={()=>setMode(CURATING)}>CURATE</button>
        <button class={`mode-button ${mode() === COLLECTING ? 'active-mode' : ''}`} onClick={()=>setMode(COLLECTING)}>COLLECT</button>
      </div>
      <div class="buttons">
        {/* <button class="other-button" onClick={()=>openSpecimenDialog( getCollectingSession( lastOpenedSession() ) )}>New Specimen</button> */}
        <button class="other-button" onClick={loadFromResource}>Load From Source</button>
        <button class="other-button" onClick={loadFromStorage} >Load From Local</button>
        <button class="other-button" onClick={saveDataLocally} >Save To Local</button>
        <button class="other-button" onClick={backUpFile}>Back Up</button>
      </div>
      <div class="status">
        <div>Session: {sessionName()}</div>
        <div>Last ID: {data().lastNumber}</div>
        <Show when= { mode() !== VIEWING } >
          <div>Last ID (local): {localData().lastNumber}</div>
          <div>Last ID (source): {sourceData().lastNumber}</div>
        </Show>
      </div>
      <div id="container">
        <div id="collection">
          <div id="picker">
            <CollectingSession session={ data() } path={[]} />
          </div>
          <div id="detail">
            <SpecimenDetails/>
          </div>
        </div>
      </div>
      <Show when={mode() === COLLECTING}>
        <NewSession show={!!newSessionParent()} close={saveNewSession} />
        <NewSpecimen show={!!newSpecimenParent()} close={saveNewSpecimen} nextId={getNextId} />
      </Show>
    </>
  );
}

const App = () => (
  <ModeProvider>
    <DataProvider>
      <SelectionProvider>
        <EditorProvider>
          <AppUI/>
        </EditorProvider>
      </SelectionProvider>
    </DataProvider>
  </ModeProvider>
);

export { App }

