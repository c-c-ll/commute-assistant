// Supabase Edge Function: proxy AMap API calls
// Supports: /api/transit, /api/geocode, /api/inputtips

const AMAP_KEY = Deno.env.get("AMAP_WEB_KEY") || "";
const AMAP_BASE = "https://restapi.amap.com/v3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace("/functions/v1/amap-proxy", "");

  try {
    let amapUrl = "";

    if (path === "/api/transit") {
      const origin = url.searchParams.get("origin");
      const destination = url.searchParams.get("destination");
      const city = url.searchParams.get("city") || "北京";
      const time = url.searchParams.get("time");

      if (!origin || !destination) {
        return new Response(JSON.stringify({ error: "缺少参数" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params = new URLSearchParams({
        key: AMAP_KEY, origin, destination, city,
        strategy: "0", nightflag: "0",
      });
      if (time) params.set("time", time);
      amapUrl = `${AMAP_BASE}/direction/transit/integrated?${params}`;

    } else if (path === "/api/geocode") {
      const address = url.searchParams.get("address");
      const city = url.searchParams.get("city") || "北京";
      if (!address) {
        return new Response(JSON.stringify({ error: "缺少参数" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const params = new URLSearchParams({ key: AMAP_KEY, address, city });
      amapUrl = `${AMAP_BASE}/geocode/geo?${params}`;

    } else if (path === "/api/inputtips") {
      const keywords = url.searchParams.get("keywords");
      const city = url.searchParams.get("city") || "北京";
      if (!keywords) {
        return new Response(JSON.stringify({ error: "缺少参数" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const params = new URLSearchParams({ key: AMAP_KEY, keywords, city, citylimit: "true" });
      amapUrl = `${AMAP_BASE}/assistant/inputtips?${params}`;

    } else {
      return new Response(JSON.stringify({ error: "未知端点", path }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch(amapUrl);
    const data = await resp.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});