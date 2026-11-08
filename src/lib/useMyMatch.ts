import { api } from './backend';
import { useLive } from './hooks';

/** The policyholder's current match (pending, active or established), if any. */
export function useMyMatch() {
  const r = useLive(() => api.listMyMatches());
  const match = r.data?.find((m) => ['pending_approval', 'active', 'established'].includes(m.status));
  return { ...r, match, loaded: r.data !== undefined };
}
