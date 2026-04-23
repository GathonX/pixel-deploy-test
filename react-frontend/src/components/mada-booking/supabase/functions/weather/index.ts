import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");

  if (!lat || !lon) {
    return new Response(JSON.stringify({ error: "lat and lon required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("OPENWEATHER_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENWEATHER_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Current weather
    const currentRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${apiKey}`
    );
    const current = await currentRes.json();

    // 5-day forecast
    const forecastRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${apiKey}`
    );
    const forecastData = await forecastRes.json();

    // Process forecast - one entry per day (noon)
    const dailyForecast = (forecastData.list || [])
      .filter((_: any, i: number) => i % 8 === 4) // ~noon entries
      .slice(0, 5)
      .map((entry: any) => ({
        day: new Date(entry.dt * 1000).toLocaleDateString("fr-FR", { weekday: "short" }),
        temp: entry.main.temp,
        weather: entry.weather?.[0]?.main || "Clouds",
        description: entry.weather?.[0]?.description || "",
      }));

    return new Response(
      JSON.stringify({
        current: {
          temp: current.main?.temp,
          weather: current.weather?.[0]?.main || "Clouds",
          description: current.weather?.[0]?.description || "",
          humidity: current.main?.humidity,
        },
        forecast: dailyForecast,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to fetch weather" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
