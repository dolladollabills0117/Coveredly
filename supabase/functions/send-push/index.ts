// Edge Function: sends an Expo push notification for every new row in `notifications`
// (celebrations, new matches, messages). Hook it up in Supabase Dashboard →
// Database → Webhooks: table `notifications`, event INSERT, type "Supabase Edge Function" → send-push.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const { record } = await req.json();
  if (!record?.user_id) return new Response('ignored');
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: tokens } = await admin.from('push_tokens').select('token').eq('user_id', record.user_id);
  if (!tokens?.length) return new Response('no tokens');
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tokens.map((t) => ({
      to: t.token, title: record.title, body: record.body, sound: 'default',
      data: { matchId: record.match_id, kind: record.kind },
    }))),
  });
  return new Response(await res.text());
});
