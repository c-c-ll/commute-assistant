/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function getVapidPublicKey(): string {
  const meta = document.querySelector('meta[name="vapid-public-key"]');
  return meta ? meta.getAttribute('content') || '' : '';
}

export async function savePushSubscription(subscription: PushSubscription) {
  if (!supabase) return null;
  const json = subscription.toJSON();
  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert({
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh || '',
      auth: json.keys?.auth || '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });

  if (error) console.error('Failed to save push subscription:', error);
  return data;
}

export async function saveCommuteSettings(settings: {
  origin: string;
  destination: string;
  origin_coords?: string;
  dest_coords?: string;
  remind_time: string;
  days_of_week: number[];
  enabled: boolean;
}) {
  if (!supabase) return null;
  const { data: existing } = await supabase.from('commute_settings').select('id').limit(1);
  const id = existing && existing.length > 0 ? existing[0].id : null;

  if (id) {
    return supabase.from('commute_settings').update(settings).eq('id', id);
  } else {
    return supabase.from('commute_settings').insert(settings);
  }
}

export async function getCommuteSettings() {
  if (!supabase) return null;
  const { data } = await supabase.from('commute_settings').select('*').limit(1);
  return data && data.length > 0 ? data[0] : null;
}

export async function getVapidKeys(): Promise<{ publicKey: string } | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('vapid_keys').select('public_key').eq('id', 1).single();
  if (!data) return null;
  return { publicKey: data.public_key };
}