import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { target, action = "verify" } = await req.json();

    if (!target || typeof target !== "string") {
      return new Response(JSON.stringify({ error: "target is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedTarget = target.toLowerCase().trim();

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

    // Store in DB using service role (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Delete previous unused OTPs for this target+action
    await supabaseAdmin
      .from("otp_codes")
      .delete()
      .eq("target", normalizedTarget)
      .eq("action", action)
      .eq("verified", false);

    // Insert new OTP
    const { error: insertError } = await supabaseAdmin
      .from("otp_codes")
      .insert({ target: normalizedTarget, code, action, expires_at: expiresAt });

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to store OTP" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to send email via Resend (if API key is configured)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (resendKey && normalizedTarget.includes("@")) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: Deno.env.get("OTP_FROM_EMAIL") || "Shreenathji Angan <otp@shreenathjiangan.in>",
            to: [normalizedTarget],
            subject: `Your verification code: ${code}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #6C63FF; text-align: center;">Shreenathji Angan</h2>
                <p style="text-align: center; color: #555;">Your verification code is:</p>
                <div style="text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #333; margin: 24px 0; padding: 16px; background: #f5f5f5; border-radius: 12px;">
                  ${code}
                </div>
                <p style="text-align: center; color: #888; font-size: 14px;">This code expires in 5 minutes. Do not share it with anyone.</p>
              </div>
            `,
          }),
        });
        emailSent = emailRes.ok;
      } catch {
        // Email sending failed — fall through to return code in response
      }
    }

    // If email was sent, don't return the code (security)
    // Otherwise, return the code so the app can show it in Alert (testing/fallback)
    const response: Record<string, unknown> = {
      success: true,
      delivered: emailSent,
      target: normalizedTarget,
      expiresInSeconds: 300,
    };

    if (!emailSent) {
      // Fallback: return code so app can display it
      response.code = code;
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
