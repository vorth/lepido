import { createEffect } from "solid-js";

import { useSelection } from "../context/selection.jsx";
import { LABELING, useMode } from "../context/mode.jsx";

export const Specimen = props =>
{
  const { selectedId, selectSpecimen, labelSelection, toggleLabelSelection } = useSelection();
  const { mode } = useMode();
  const isSelected = () => selectedId() === props.specimen.id;
  const isLabelSelected = () => labelSelection().has( props.specimen.id );
  const clickHandler = e =>
  {
    e .stopPropagation();
    if ( mode() === LABELING ) {
      toggleLabelSelection( props.specimen.id );
    } else {
      selectSpecimen( props.specimen.id );
    }
  }
  let elt;
  const scrollToSelf = () => elt.scrollIntoView( { behavior: 'smooth', block: 'nearest' } );

  createEffect( isSelected, selected => {
    if ( !! elt && selected ) {
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
    <li ref={elt} id={`id-${props.specimen.id}`} onClick={clickHandler}
      class={ [ 'specimen', { selected: isSelected(), 'label-selected': isLabelSelected() } ] } >
      {`${props.specimen.id ?? ''} ${props.specimen.genus ?? ''} ${props.specimen.species ?? ''}`}
    </li>
  );
}
