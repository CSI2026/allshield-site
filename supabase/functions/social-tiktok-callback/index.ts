const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const TARGET = `${SUPABASE_URL}/functions/v1/social-connection-admin`;

Deno.serve((req: Request) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const incoming = new URL(req.url);
  const target = new URL(TARGET);
  target.searchParams.set('provider', 'tiktok');
  target.searchParams.set('callback', '1');

  for (const key of ['code', 'state', 'error', 'error_description']) {
    const value = incoming.searchParams.get(key);
    if (value) target.searchParams.set(key, value);
  }

  return Response.redirect(target.toString(), 302);
});
