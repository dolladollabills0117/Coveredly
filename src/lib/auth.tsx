import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './backend';
import type { Role, User } from './types';

interface AuthCtx {
  user: User | null | undefined; // undefined = still loading
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, role: Role, name: string) => Promise<User>;
  signOut: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const refresh = useCallback(async () => setUser(await api.getUser().catch(() => null)), []);
  useEffect(() => { refresh(); }, [refresh]);
  return (
    <Ctx.Provider value={{
      user, refresh,
      signIn: async (e, p) => { const u = await api.signIn(e, p); setUser(u); return u; },
      signUp: async (e, p, r, n) => { const u = await api.signUp(e, p, r, n); setUser(u); return u; },
      signOut: async () => { await api.signOut(); setUser(null); },
    }}>{children}</Ctx.Provider>
  );
}
export const useAuth = () => useContext(Ctx);

/** Where each user belongs: quiz first, then their side of the app. */
export function homeFor(u: User) {
  if (u.role === 'admin') return '/admin' as const;
  if (!u.quizDone) return u.role === 'agent' ? ('/quiz/agent' as const) : ('/quiz/policyholder' as const);
  if (u.role === 'agent' && u.plan?.status !== 'active') return '/plan' as const;
  return u.role === 'agent' ? ('/agent' as const) : ('/policyholder' as const);
}
