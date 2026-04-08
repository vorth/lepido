
import { createSignal, onMount, Show } from 'solid-js'

import './App.css';
import './labels.css';
import { NewSession, SpecimenDialog } from './dialogs.jsx';
import { CollectingSession } from './component/session.jsx';
import { SpecimenDetails } from './component/details.jsx';
import { LabelsPanel } from './component/labels.jsx';
import { CURATING, LABELING, ModeProvider, VIEWING, useMode } from './context/mode.jsx';
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
    saveNewSpecimenFromDialog,
    editingSpecimen, saveEditedSpecimen,
    lastOpenedSession } = useEditor();

  const sessionName = () => (lastOpenedSession && lastOpenedSession()?.join('/')) || '';
  const [topBarOpen, setTopBarOpen] = createSignal(false);
  const toggleTopBar = () => setTopBarOpen(prev => !prev);

  onMount( () => {
    loadStorage();
    if ( mode() === VIEWING ) {
      loadFromResource() .then( () => {
        if ( !! specimenID ) {
          setSelectedId( specimenID );
        }
      } );
    }
  } );

  const doSetMode = newMode => () =>
    setMode( newMode );

  return (
    <>
      <div class="mode-buttons buttons">
        <button class={`mode-button ${mode() === VIEWING ? 'active-mode' : ''}`} onClick={doSetMode(VIEWING)}>VIEW</button>
        <button class={`mode-button ${mode() === CURATING ? 'active-mode' : ''}`} onClick={doSetMode(CURATING)}>CURATE</button>
        <button class={`mode-button ${mode() === LABELING ? 'active-mode' : ''}`} onClick={doSetMode(LABELING)}>LABELS</button>
      </div>

      <div class={`top-bar ${topBarOpen() ? 'top-bar-open' : 'top-bar-collapsed'}`}>
        <Show when={topBarOpen()}>
          <div class="load-save-buttons buttons">
            {/* <button class="other-button" onClick={()=>openSpecimenDialog( getCollectingSession( lastOpenedSession() ) )}>New Specimen</button> */}
            <button class="other-button" onClick={loadFromResource}>Load From Source</button>
            <button class="other-button" onClick={loadFromStorage} >Load From Local</button>
            <button class="other-button" onClick={saveDataLocally} >Save To Local</button>
            <button class="other-button" onClick={backUpFile}>Back Up</button>
          </div>
          <div class="status">
            <div>Session: {sessionName()}</div>
            <div>Last ID: {data().lastNumber}</div>
            <div>Last ID (local): {localData().lastNumber}</div>
            <div>Last ID (source): {sourceData().lastNumber}</div>
          </div>
        </Show>
        <button class="top-bar-toggle" onClick={toggleTopBar}>
          {topBarOpen() ? '▲' : '▶'}
        </button>
      </div>
      <div id="container">
        <div id="collection" class={mode() === LABELING ? 'labels-layout' : ''}>
          <div id="picker">
            <CollectingSession session={ data() } path={[]} />
          </div>
          <Show when={mode() === LABELING} fallback={
            <div id="detail">
              <SpecimenDetails/>
            </div>
          }>
            <LabelsPanel />
          </Show>
        </div>
      </div>
      <Show when={mode() === CURATING}>
        <NewSession show={!!newSessionParent()} close={saveNewSession} />
        <SpecimenDialog show={!!newSpecimenParent()} close={saveNewSpecimenFromDialog} nextId={getNextId} />
        <SpecimenDialog show={!!editingSpecimen()} close={saveEditedSpecimen} specimen={editingSpecimen()} />
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

