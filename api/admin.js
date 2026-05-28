import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const ADMIN_ID = process.env.ADMIN_ID;

export default async function handler(req, res) {
  try {

    const { telegram_id, action, target_id } = req.body;

    if (telegram_id != ADMIN_ID) {
      return res.status(403).json({ error: "Not admin" });
    }

    if (action === "ban") {
      await supabase
        .from("users")
        .update({ balance: 0 })
        .eq("telegram_id", target_id);
    }

    if (action === "add_balance") {
      await supabase
        .from("users")
        .update({ balance: 9999 })
        .eq("telegram_id", target_id);
    }

    await supabase
      .from("admin_actions")
      .insert({
        telegram_id,
        action,
        target_id
      });

    return res.json({ success: true });

  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}
