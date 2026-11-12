import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { AGENT_TERMS_VERSION } from '../../supabase/functions/_shared/standing';
import { homeFor, useAuth } from '../lib/auth';
import { colors, fonts } from '../lib/theme';
import type { Role } from '../lib/types';

/** Bottom tabs + role guard: each side of the app only opens for its own role. */
export function RoleTabs({ role, tabs }: { role: Role; tabs: { name: string; title: string; icon: keyof typeof Ionicons.glyphMap }[] }) {
  const { user } = useAuth();
  if (user === undefined) return null;
  if (!user) return <Redirect href="/" />;
  if (user.role !== role || (role !== 'admin' && !user.quizDone) || (role === 'agent' && (user.plan?.status !== 'active' || user.termsVersion !== AGENT_TERMS_VERSION))) return <Redirect href={homeFor(user)} />;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.orange,
      tabBarInactiveTintColor: '#9A8B7D',
      tabBarStyle: { backgroundColor: colors.cream, borderTopColor: colors.line, height: 84, paddingTop: 8 },
      tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
      sceneStyle: { backgroundColor: colors.peach },
    }}>
      {tabs.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{
          title: t.title,
          tabBarIcon: ({ color, focused }) => <Ionicons name={(focused ? t.icon.replace('-outline', '') : t.icon) as any} size={24} color={color as string} />,
        }} />
      ))}
    </Tabs>
  );
}
