
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

const locationChildren = location =>
  Array.isArray( location ?.location ) ? location.location : location ?.location ? [ location.location ] : [];

const findLocationByName = ( locations, name ) =>
{
  for ( const location of locationChildren( locations ) ) {
    if ( location.name === name ) {
      return location;
    }
    const found = findLocationByName( location, name );
    if ( !! found ) {
      return found;
    }
  }
  return null;
}

// Resolves a ref into the `locations` table, such as "home", "home.hedge" or "chokoloskee".
//  The first name may be anywhere in the table; any further names are its descendants.
const resolveLocationRef = ( locations, ref ) =>
{
  const [ first, ...rest ] = ref .split( '.' );
  let resolved = findLocationByName( locations, first );
  for ( const name of rest ) {
    resolved = resolved && locationChildren( resolved ) .find( l => l.name === name );
  }
  return resolved || null;
}

// A place may be a plain string, or { '#text', latLong } left over from the old XML
const placeText = place => typeof place === 'object' ? place ?.[ '#text' ] : place;

// The text describing where a specimen was found, for labels and display.  A specimen's
//  location is a string, or an object with a `ref` into the `locations` table and/or a
//  `place` of its own.  Coordinates are left out; they're in the specimen's `latLong`.
export const locationText = ( location, locations ) =>
{
  if ( ! location || typeof location !== 'object' ) {
    return location || '';
  }
  const parts = [];
  if ( location.ref ) {
    const resolved = resolveLocationRef( locations, location.ref );
    parts .push( resolved ? placeText( resolved.place ) : location.ref );
  }
  if ( location.place ) {
    parts .push( placeText( location.place ) );
  }
  return parts .filter( Boolean ) .join( '; ' );
}
