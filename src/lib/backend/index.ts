import { demoBackend } from './demo';
import { supabaseBackend } from './supabase';

export const isDemo = !(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
export const api = isDemo ? demoBackend : supabaseBackend;
