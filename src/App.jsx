
import { createEffect, createSignal, mergeProps } from 'solid-js'

import './App.css'

const Specimen = props =>
{
  props = mergeProps( { id: '', genus: '', species: '' }, props );
  return (
    <li class='specimen'>
      {`${props.id} ${props.genus} ${props.species}`}
    </li>
  );
}

const CollectingSession = props =>
{
  const [ specimensCollapsed, setSpecimensCollapsed ] = createSignal( true );
  const [ sessionsCollapsed, setSessionsCollapsed ] = createSignal( false );

  const toggleCollapsed = e =>
  {
    e .stopPropagation();
    setSpecimensCollapsed( val => !val );
  }

  return (
    <ul class='sessionList' onClick={ toggleCollapsed }>
      {props.session.name || 'COLLECTION'}
      <Show when={ !specimensCollapsed() }>
        <Show when={ Array.isArray( props.session.specimen ) } fallback={
          <Specimen {...props.session.specimen}/>
        }>
          <For each={props.session.specimen}>{ singleSpecimen =>
            <Specimen {...singleSpecimen}/>
          }</For>
        </Show>
      </Show>
      <Show when={ !sessionsCollapsed() }>
        <For each={props.session.collectingSession}>{ session =>
          <li class='session'>
            <CollectingSession session={ session } />
          </li>
        }</For>
      </Show>
    </ul>
  );
}

const App = () =>
{
  const [ data, setData ] = createSignal( {} );
  fetch( './Lepid.json' )
    .then( response => response.text() )
    .then( text => setData( JSON.parse( text ) ) );

  return (
    <>
      <h1>Butterfly Collection</h1>
      <CollectingSession session={ data() } />
    </>
  )
}

export { App }

