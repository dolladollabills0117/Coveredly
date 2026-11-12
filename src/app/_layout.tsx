import { Fraunces_600SemiBold, Fraunces_600SemiBold_Italic } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CelebrationHost } from '../components/Celebration';
import { AuthProvider, useAuth } from '../lib/auth';
import { PrefsProvider } from '../lib/prefs';
import { registerForPush } from '../lib/push';
import { colors } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { user } = useAuth();
  const userId = user?.id;
  useEffect(() => { if (userId) registerForPush(userId).catch(() => {}); }, [userId]);
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.peach } }}>
        <Stack.Screen name="lead/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="policy/[id]" options={{ presentation: 'card' }} />
      </Stack>
      {user && user.role !== 'admin' && <CelebrationHost key={user.id} />}
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Fraunces_600SemiBold, Fraunces_600SemiBold_Italic, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <PrefsProvider>
        <AuthProvider>
          <Shell />
        </AuthProvider>
      </PrefsProvider>
    </SafeAreaProvider>
  );
}
