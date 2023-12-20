
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
  return (
    <ul class='sessionList'>
      {props.session.name || 'COLLECTION'}
      <Show when={ !props.collapsed }>
        <Show when={ Array.isArray( props.session.specimen ) } fallback={
          <Specimen {...props.session.specimen}/>
        }>
          <For each={props.session.specimen}>{ singleSpecimen =>
            <Specimen {...singleSpecimen}/>
          }</For>
        </Show>
        <For each={props.session.collectingSession}>{ session =>
          <li class='session'>
            <CollectingSession session={ session } collapsed={true} />
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

