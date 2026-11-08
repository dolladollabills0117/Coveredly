import { router } from 'expo-router';
import { useState } from 'react';
import { api } from '../lib/backend';
import { useMyMatch } from '../lib/useMyMatch';
import { Button } from './ui';

/** "Find your agent match" before a match, "Message your agent" after. */
export function MatchCTA() {
  const { match, loaded, reload } = useMyMatch();
  const [busy, setBusy] = useState(false);
  if (!loaded) return null;
  if (match?.status === 'active' || match?.status === 'established')
    return <Button title="Message your agent" icon="chatbubbles" variant="dark" onPress={() => router.push(`/chat/${match.id}`)} />;
  if (match?.status === 'pending_approval')
    return <Button title="Finding your match…" icon="hourglass-outline" variant="outline" disabled />;
  return (
    <Button title="Find your agent match" icon="sparkles" loading={busy}
      onPress={async () => { setBusy(true); try { await api.requestMatch(); reload(); } finally { setBusy(false); } }} />
  );
}
