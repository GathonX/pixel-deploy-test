import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { type, reservation_id } = await req.json();

    if (!type || !reservation_id) {
      return new Response(JSON.stringify({ error: "type and reservation_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get template
    const { data: template, error: tErr } = await supabase
      .from("email_templates")
      .select("*")
      .eq("type", type)
      .single();

    if (tErr || !template) {
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get reservation with product info
    const { data: reservation, error: rErr } = await supabase
      .from("reservations")
      .select("*, products(name, price, type)")
      .eq("id", reservation_id)
      .single();

    if (rErr || !reservation) {
      return new Response(JSON.stringify({ error: "Reservation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!reservation.client_email) {
      return new Response(JSON.stringify({ error: "No client email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate total
    const days = Math.max(1, Math.ceil(
      (new Date(reservation.end_date).getTime() - new Date(reservation.start_date).getTime()) / 86400000
    ));
    const total = Number((reservation as any).products?.price || 0) * reservation.persons * days;

    // Replace variables
    const vars: Record<string, string> = {
      "{{client_name}}": reservation.client_name,
      "{{product_name}}": (reservation as any).products?.name || "",
      "{{dates}}": `${reservation.start_date} → ${reservation.end_date}`,
      "{{total}}": String(total),
    };

    let subject = template.subject;
    let body = template.body_html;
    for (const [key, val] of Object.entries(vars)) {
      subject = subject.replaceAll(key, val);
      body = body.replaceAll(key, val);
    }

    // Send via Resend
    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "MadagasBooking <noreply@madagasbooking.com>",
        to: [reservation.client_email],
        subject,
        html: body,
      }),
    });

    const sendResult = await sendRes.json();

    return new Response(JSON.stringify({ success: true, result: sendResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
