
import { unwrap } from "solid-js/store";

// Pure helpers for walking the collection tree.  They work on plain objects,
//  store proxies, and produce() drafts alike.

// Records converted from the old XML can hold a lone specimen object rather than an array.
export const normalizeSession = session =>
{
  if ( session.specimen && ! Array.isArray( session.specimen ) ) {
    session.specimen = [ session.specimen ];
  }
  if ( Array.isArray( session.collectingSession ) ) {
    session.collectingSession .forEach( normalizeSession );
  }
  return session;
}

export const findSpecimen = ( session, specimenID ) =>
{
  if ( !session || !specimenID ) {
    return {};
  }
  const specimen = session.specimen ?.find( s => s.id == specimenID ); // intentional loose equality
  if ( !! specimen ) {
    return { specimen, container: session };
  }
  for ( const subSession of session.collectingSession || [] ) {
    const found = findSpecimen( subSession, specimenID );
    if ( !! found.specimen ) {
      return found;
    }
  }
  return {};
}

// Locates the node in `session`'s tree that wraps the same raw object as `target`,
//  e.g. to find the produce() draft corresponding to a store proxy held by a component.
export const findSession = ( session, target ) =>
{
  if ( !session || !target ) {
    return null;
  }
  if ( unwrap( session ) === unwrap( target ) ) {
    return session;
  }
  for ( const subSession of session.collectingSession || [] ) {
    const found = findSession( subSession, target );
    if ( !! found ) {
      return found;
    }
  }
  return null;
}

export const collectAllSpecimens = ( session, result = [] ) =>
{
  if ( !session ) return result;
  if ( session.specimen ) {
    result.push( ...session.specimen );
  }
  for ( const sub of session.collectingSession || [] ) {
    collectAllSpecimens( sub, result );
  }
  return result;
}
