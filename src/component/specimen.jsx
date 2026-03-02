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
  createEffect( () => {
    if ( !! elt ) {
      if ( isSelected() ) {
        elt.scrollIntoView( { behavior: 'smooth', block: 'nearest' } );
      }
    }
  });

  return (
    <li ref={elt} id={`id-${props.specimen.id}`} class='specimen' onClick={clickHandler}
      classList={ { selected: isSelected(), 'label-selected': isLabelSelected() } } >
      {`${id} ${genus} ${species}`}
    </li>
  );
}
