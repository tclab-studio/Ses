import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req: Request) => {
  try {
    const { follower_id, following_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [{ data: follower }, { data: tokenRow }] = await Promise.all([
      supabase
        .from("profiles")
        .select("username")
        .eq("id", follower_id)
        .single(),
      supabase
        .from("push_tokens")
        .select("token")
        .eq("user_id", following_id)
        .single(),
    ]);

    if (!follower?.username || !tokenRow?.token) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: tokenRow.token,
        title: "New follower",
        body: `@${follower.username} followed you`,
        data: { type: "follow", username: follower.username },
        channelId: "follows",
        priority: "high",
        sound: "default",
      }),
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
});
