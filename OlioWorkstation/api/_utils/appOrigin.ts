// Keep origin validation independent of email rendering and delivery dependencies.
export function appOrigin() {
  const url = new URL(process.env.APP_ORIGIN || 'https://olio.one');
  if (
    url.protocol !== 'https:' ||
    url.pathname !== '/' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('Invalid application origin configuration.');
  return url.origin;
}
