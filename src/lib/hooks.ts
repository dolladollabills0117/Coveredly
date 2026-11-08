import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './backend';

/** Loads data and reloads it whenever anything changes (realtime). */
export function useLive<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const reload = useCallback(() => {
    fnRef.current().then((d) => { setData(d); setError(null); }).catch((e) => setError(String(e?.message ?? e)));
  }, []);
  useEffect(() => {
    reload();
    return api.subscribe(reload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error, reload, loading: data === undefined && !error };
}

export const timeAgo = (iso?: string) => {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
