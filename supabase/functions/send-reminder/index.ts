// Supabase Edge Function: check commute times and send push reminders
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SB_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SB_SERVICE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:commute@example.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getBJTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const now = getBJTime();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    // Get all enabled commute settings
    const { data: settings, error } = await supabase
      .from("commute_settings")
      .select("*")
      .eq("enabled", true);

    if (error || !settings || settings.length === 0) {
      return new Response(JSON.stringify({ ok: true, matched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get VAPID keys
    const { data: vapidData } = await supabase
      .from("vapid_keys")
      .select("*")
      .eq("id", 1)
      .single();

    if (!vapidData) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all push subscriptions
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*");

    const matched: string[] = [];

    for (const setting of settings) {
      // Check if today is a commute day
      const days: number[] = setting.days_of_week || [1, 2, 3, 4, 5];
      if (!days.includes(dayOfWeek)) continue;

      // Check if it's time (+/- 1 minute window since cron runs every minute)
      const remindTime = setting.remind_time; // "HH:MM"
      const [h, m] = remindTime.split(":").map(Number);
      const remindMinutes = h * 60 + m;

      if (Math.abs(nowMinutes - remindMinutes) > 1) continue;

      // Time matches! Send push to all subscribers
      const routeLink = setting.origin_coords && setting.dest_coords
        ? `/?from=${encodeURIComponent(setting.origin)}&to=${encodeURIComponent(setting.destination)}`
        : "/";

      for (const sub of (subscriptions || [])) {
        try {
          // Use Web Push protocol
          const pushBody = JSON.stringify({
            title: "閫氬嫟鎻愰啋",
            body: `${setting.origin} 鈫?${setting.destination}` + "\n鐐瑰嚮鏌ョ湅浠婃棩璺嚎",
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            data: { url: routeLink },
            actions: [{ action: "open", title: "鏌ョ湅璺嚎" }],
          });

          const jwtHeader = { typ: "JWT", alg: "ES256" };
          const jwtPayload = {
            aud: new URL(sub.endpoint).origin,
            exp: Math.floor(Date.now() / 1000) + 86400,
            sub: VAPID_SUBJECT,
          };

          // Encode VAPID JWT manually
          const encoder = new TextEncoder();
          const headerB64 = btoa(JSON.stringify(jwtHeader)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
          const payloadB64 = btoa(JSON.stringify(jwtPayload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

          // Import VAPID private key
          const privateKeyBytes = Uint8Array.from(
            atob(vapidData.private_key.replace(/-/g, "+").replace(/_/g, "/")),
            (c) => c.charCodeAt(0)
          );

          const key = await crypto.subtle.importKey(
            "raw", privateKeyBytes,
            { name: "ECDSA", namedCurve: "P-256" },
            false, ["sign"]
          );

          const signatureInput = encoder.encode(`${headerB64}.${payloadB64}`);
          const signature = await crypto.subtle.sign(
            { name: "ECDSA", hash: { name: "SHA-256" } },
            key, signatureInput
          );

          const signatureB64 = btoa(
            String.fromCharCode(...new Uint8Array(signature))
          ).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

          const vapidJWT = `${headerB64}.${payloadB64}.${signatureB64}`;

          await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "aes128gcm",
              "TTL": "86400",
              "Authorization": `vapid t=${vapidJWT}, k=${vapidData.public_key}`,
              "Urgency": "normal",
            },
            body: pushBody,
          });

          matched.push(sub.endpoint);
        } catch {
          // skip failed pushes
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, matched: matched.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});