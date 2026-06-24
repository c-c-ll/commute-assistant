// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase, getVapidPublicKey, savePushSubscription } from '../utils/supabase';

interface PushState {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  error: string | null;
}

export function usePushNotifications(): [PushState, () => Promise<void>] {
  const [state, setState] = useState<PushState>({
    supported: ("serviceWorker" in navigator) && ("PushManager" in window),
    permission: "default",
    subscribed: false,
    error: null,
  });

  useEffect(function() {
    if (!state.supported) return;
    setState(function(s) { return Object.assign({}, s, { permission: Notification.permission }); });
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(function(reg) {
        reg.pushManager.getSubscription().then(function(sub) {
          setState(function(s) { return Object.assign({}, s, { subscribed: !!sub }); });
        });
      });
    }
  }, [state.supported]);

  var subscribe = async function() {
    if (!state.supported || !supabase) {
      setState(function(s) { return Object.assign({}, s, { error: "姝ゆ祻瑙堝櫒涓嶆敮鎸佹帹閫侀€氱煡" }); });
      return;
    }
    try {
      var permission = await Notification.requestPermission();
      setState(function(s) { return Object.assign({}, s, { permission: permission }); });
      if (permission !== "granted") {
        setState(function(s) { return Object.assign({}, s, { error: "璇峰厑璁搁€氱煡鏉冮檺" }); });
        return;
      }
      var vapidKey = getVapidPublicKey();
      if (!vapidKey) {
        setState(function(s) { return Object.assign({}, s, { error: "鎺ㄩ€侀厤缃湭瀹屾垚" }); });
        return;
      }
      var reg = await navigator.serviceWorker.ready;
      var subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        } as PushSubscriptionOptionsInit);
      }
      await savePushSubscription(subscription);
      setState(function(s) { return Object.assign({}, s, { subscribed: true, error: null }); });
    } catch (e) {
      var msg = e instanceof Error ? e.message : "璁㈤槄澶辫触";
      setState(function(s) { return Object.assign({}, s, { error: msg }); });
    }
  };

  return [state, subscribe];
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  var padding = "=".repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding).replace(/-/g, "+").replace(/\//g, "_");
  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);
  for (var i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}