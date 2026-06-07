import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function validateTelegramInitData(
  initData: string,
  botToken: string,
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return { valid: false, reason: "missing hash" };

    const authDate = parseInt(params.get("auth_date") ?? "0", 10);
    if (!authDate) return { valid: false, reason: "missing auth_date" };

    const ageSec = Math.floor(Date.now() / 1000) - authDate;
    if (ageSec > 300) {
      return { valid: false, reason: `initData expired (${ageSec}s old)` };
    }

    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const enc = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const secretKeyBytes = await crypto.subtle.sign(
      "HMAC",
      keyMaterial,
      enc.encode(botToken),
    );

    const signingKey = await crypto.subtle.importKey(
      "raw",
      secretKeyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      signingKey,
      enc.encode(dataCheckString),
    );

    const computedHash = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return computedHash === hash
      ? { valid: true }
      : { valid: false, reason: "hash mismatch" };
  } catch (e) {
    return { valid: false, reason: String(e) };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const { initData } = await req.json();
    if (!initData) return json({ error: "No initData provided" }, 400);

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken)
      return json({ error: "TELEGRAM_BOT_TOKEN not configured" }, 500);

    const { valid, reason } = await validateTelegramInitData(
      initData,
      botToken,
    );
    if (!valid) return json({ error: `Invalid initData: ${reason}` }, 401);

    const params = new URLSearchParams(initData);
    const userRaw = params.get("user");
    if (!userRaw) return json({ error: "No user in initData" }, 400);

    const tgUser = JSON.parse(userRaw);
    const tgId = String(tgUser.id);
    const username = (tgUser.username as string | undefined) ?? null;
    const fullName = [tgUser.first_name, tgUser.last_name]
      .filter(Boolean)
      .join(" ");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = `tg_${tgId}@telegram.local`;
    const password = `tg_${tgId}_${botToken.slice(0, 16)}`;

    let userId: string;

    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          avatar_url: tgUser.photo_url ?? null,
          telegram_id: tgId,
          telegram_username: username,
          provider: "telegram",
        },
      });

    if (createErr) {
      const alreadyExists =
        createErr.message.toLowerCase().includes("already") ||
        createErr.message.toLowerCase().includes("registered");

      if (!alreadyExists) {
        return json({ error: `createUser failed: ${createErr.message}` }, 500);
      }

      const { data: listData, error: listErr } =
        await admin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

      if (listErr)
        return json({ error: `listUsers failed: ${listErr.message}` }, 500);

      const existing = listData?.users?.find((u) => u.email === email);
      if (!existing)
        return json({ error: "User exists but lookup failed" }, 500);

      userId = existing.id;

      const { error: updateErr } = await admin.auth.admin.updateUserById(
        userId,
        {
          password,
        },
      );
      if (updateErr)
        return json(
          { error: `Password reset failed: ${updateErr.message}` },
          500,
        );
    } else {
      userId = created!.user.id;

      await admin.from("profiles").upsert({
        id: userId,
        username: username ? username.toLowerCase() : null,
        updated_at: new Date().toISOString(),
      });
    }

    const { data: signInData, error: signInErr } =
      await admin.auth.signInWithPassword({
        email,
        password,
      });

    if (signInErr || !signInData?.session) {
      return json({ error: signInErr?.message ?? "Sign in failed" }, 500);
    }

    return json({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      user: signInData.session.user,
    });
  } catch (err) {
    console.error("[tg-auth] Unhandled:", err);
    return json({ error: String(err) }, 500);
  }
});

