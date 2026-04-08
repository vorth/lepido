import { createEffect } from "solid-js";

import { useSelection } from "../context/selection.jsx";
import { LABELING, useMode } from "../context/mode.jsx";

export const Specimen = props =>
{
  const { id = '', genus = '', species = '' } = props.specimen; // an actual reference to the parsed data
  const { selectedId, setSelectedId, labelSelection, toggleLabelSelection } = useSelection();
  const { mode } = useMode();
  const isSelected = () => selectedId() === props.specimen.id;
  const isLabelSelected = () => labelSelection().has( props.specimen.id );
  const clickHandler = e =>
  {
    e .stopPropagation();
    if ( mode() === LABELING ) {
      toggleLabelSelection( props.specimen.id );
    } else {
      setSelectedId( props.specimen.id );
    }
  }
  let elt;
  const scrollToSelf = () => elt.scrollIntoView( { behavior: 'smooth', block: 'nearest' } );

  createEffect( () => {
    if ( !! elt && isSelected() ) {
      const collapsible = elt.closest( '.session-collapsible' );
      if ( !collapsible ) {
        scrollToSelf();
        return;
      }
      // Wait for any CSS transition to finish, with a fallback timeout
      // in case the element is already fully expanded (no transition fires)
      let done = false;
      const finish = () => {
        if ( done ) return;
        done = true;
        collapsible.removeEventListener( 'transitionend', onEnd );
        scrollToSelf();
      };
      const onEnd = () => finish();
      collapsible.addEventListener( 'transitionend', onEnd );
      setTimeout( finish, 300 );
    }
  });

  return (
    <li ref={elt} id={`id-${props.specimen.id}`} class='specimen' onClick={clickHandler}
      classList={ { selected: isSelected(), 'label-selected': isLabelSelected() } } >
      {`${id} ${genus} ${species}`}
    </li>
  );
}
