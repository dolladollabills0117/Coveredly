import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/** Per-device display preferences (polka dots on/off). */
const Ctx = createContext<{ dots: boolean; setDots: (v: boolean) => void }>({ dots: true, setDots: () => {} });
const KEY = 'coveredly-prefs-dots';

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [dots, setDotsState] = useState(true);
  useEffect(() => { AsyncStorage.getItem(KEY).then((v) => { if (v !== null) setDotsState(v === '1'); }).catch(() => {}); }, []);
  const setDots = (v: boolean) => { setDotsState(v); AsyncStorage.setItem(KEY, v ? '1' : '0').catch(() => {}); };
  return <Ctx.Provider value={{ dots, setDots }}>{children}</Ctx.Provider>;
}
export const usePrefs = () => useContext(Ctx);
