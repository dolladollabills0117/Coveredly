import { api } from './backend';
import { useLive } from './hooks';
import { OPEN_FOR_POLICYHOLDER } from './types';

/** The policyholder's current match (pending, active or established), if any. */
export function useMyMatch() {
  const r = useLive(() => api.listMyMatches());
  const match = r.data?.find((m) => OPEN_FOR_POLICYHOLDER.includes(m.status));
  return { ...r, match, loaded: r.data !== undefined };
}
