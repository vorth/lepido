
// Pure helpers for walking the collection tree.  They work on plain objects,
//  store proxies, and store-setter drafts alike.

export const sessionLabel = session => session.name || 'COLLECTION';

// Session ids look like "s42".  They are assigned the first time a collection is loaded
//  and persist with the data from then on; existing ids are never changed.
const SESSION_ID = /^s(\d+)$/;

const maxSessionNumber = session =>
{
  const own = Number( SESSION_ID.exec( session.id ?? '' ) ?.[1] ?? 0 );
  return ( session.collectingSession || [] )
    .reduce( ( max, sub ) => Math.max( max, maxSessionNumber( sub ) ), own );
}

export const newSessionId = root => `s${ maxSessionNumber( root ) + 1 }`;

// Prepares a freshly parsed collection: records converted from the old XML can hold a
//  lone specimen object rather than an array, and sessions may not have ids yet.
export const normalizeCollection = root =>
{
  let next = maxSessionNumber( root ) + 1;
  const normalize = session =>
  {
    if ( ! session.id ) {
      session.id = `s${ next++ }`;
    }
    if ( session.specimen && ! Array.isArray( session.specimen ) ) {
      session.specimen = [ session.specimen ];
    }
    ( session.collectingSession || [] ) .forEach( normalize );
  }
  normalize( root );
  return root;
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

// Returns the sessions from `session` down to the one with the given id, or null
export const findSessionPath = ( session, sessionID, path = [] ) =>
{
  if ( !session || !sessionID ) {
    return null;
  }
  const here = [ ...path, session ];
  if ( session.id === sessionID ) {
    return here;
  }
  for ( const subSession of session.collectingSession || [] ) {
    const found = findSessionPath( subSession, sessionID, here );
    if ( !! found ) {
      return found;
    }
  }
  return null;
}

export const findSession = ( session, sessionID ) => findSessionPath( session, sessionID ) ?.at( -1 ) ?? null;

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
