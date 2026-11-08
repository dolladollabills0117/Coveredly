// Edge Function: permanently deletes the signed-in user's account and data
// (Apple App Store guideline 5.1.1(v) requires in-app account deletion).
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization')! } } });
  const { data } = await user.auth.getUser();
  if (!data.user) return new Response('Not signed in', { status: 401, headers: cors });
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await admin.auth.admin.deleteUser(data.user.id); // cascades to profiles and everything below
  return new Response(error ? error.message : 'deleted', { status: error ? 500 : 200, headers: cors });
});
