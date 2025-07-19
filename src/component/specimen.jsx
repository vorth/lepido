import { createEffect } from "solid-js";

import { useSelection } from "../context/selection.jsx";

export const Specimen = props =>
{
  const { id = '', genus = '', species = '' } = props.specimen; // an actual reference to the parsed data
  const { selectedId, setSelectedId } = useSelection();
  const isSelected = () => selectedId() === props.specimen.id;
  const clickHandler = e =>
  {
    e .stopPropagation();
    setSelectedId( props.specimen.id );
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
    <li ref={elt} id={`id-${props.specimen.id}`} class='specimen' onClick={clickHandler} classList={ { selected: isSelected() } } >
      {`${id} ${genus} ${species}`}
    </li>
  );
}
