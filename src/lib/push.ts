import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { isDemo } from './backend';
import { supabaseClient } from './backend/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Ask permission and save this device's Expo push token so the server can send celebrations. */
export async function registerForPush(userId: string) {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Coveredly', importance: Notifications.AndroidImportance.HIGH, lightColor: '#FF7A00' });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return; // set after `eas init`
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (!isDemo) await supabaseClient().from('push_tokens').upsert({ user_id: userId, token });
}

/** Local notification (used for celebrations while the app is open in demo mode). */
export async function localNotify(title: string, body: string) {
  if (Platform.OS === 'web') return;
  try { await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null }); } catch {}
}
