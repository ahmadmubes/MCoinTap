import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BOT_TOKEN = process.env.BOT_TOKEN;

// VERIFY TELEGRAM
function verifyTelegram(initData) {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    if (!hash) return false;

    urlParams.delete("hash");

    const dataCheckString = [...urlParams.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(BOT_TOKEN)
      .digest();

    const hmac = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    return hmac === hash;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  try {

    const { initData, action, target_id, withdraw_id } = req.body || {};

    if (!initData) {
      return res.status(400).json({ error: "Missing initData" });
    }

    if (!verifyTelegram(initData)) {
      return res.status(403).json({ error: "Invalid Telegram" });
    }

    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user"));
    const telegram_id = user.id;

    // 🔥 CHECK ROLE
    const { data: roleData } = await supabase
      .from("admin_roles")
      .select("*")
      .eq("telegram_id", telegram_id)
      .maybeSingle();

    if (!roleData) {
      return res.status(403).json({ error: "Not admin" });
    }

    const role = roleData.role; // owner / moderator

    // =========================
    // OWNER ONLY ACTIONS
    // =========================
    const isOwner = role === "owner";

    // GET USERS (owner + mod)
    if (action === "get_users") {
      const { data } = await supabase
        .from("users")
        .select("telegram_id, username, balance, referral_count, level")
        .order("balance", { ascending: false })
        .limit(50);

      return res.json({ success: true, role, data });
    }

    // BAN (OWNER ONLY)
    if (action === "ban") {
      if (!isOwner) {
        return res.status(403).json({ error: "Only owner can ban users" });
      }

      await supabase
        .from("users")
        .update({ balance: 0, referral_count: 0 })
        .eq("telegram_id", target_id);

      return res.json({ success: true });
    }

    // UNBAN (OWNER ONLY)
    if (action === "unban") {
      if (!isOwner) {
        return res.status(403).json({ error: "Only owner can unban users" });
      }

      await supabase
        .from("users")
        .update({ balance: 100 })
        .eq("telegram_id", target_id);

      return res.json({ success: true });
    }

    // WITHDRAW LIST (ALL ADMIN)
    if (action === "get_withdraw") {
      const { data } = await supabase
        .from("withdraw_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      return res.json({ success: true, role, data });
    }

    // APPROVE WITHDRAW (OWNER + MODERATOR)
    if (action === "approve_withdraw") {

      await supabase
        .from("withdraw_requests")
        .update({ status: "approved" })
        .eq("id", withdraw_id);

      return res.json({ success: true });
    }

    // REJECT WITHDRAW (ONLY OWNER)
    if (action === "reject_withdraw") {

      if (!isOwner) {
        return res.status(403).json({ error: "Only owner can reject" });
      }

      const { data: wd } = await supabase
        .from("withdraw_requests")
        .select("*")
        .eq("id", withdraw_id)
        .single();

      if (wd) {
        await supabase
          .from("users")
          .update({
            balance: supabase.raw(`balance + ${wd.amount}`)
          })
          .eq("telegram_id", wd.telegram_id);
      }

      await supabase
        .from("withdraw_requests")
        .update({ status: "rejected" })
        .eq("id", withdraw_id);

      return res.json({ success: true });
    }

    return res.status(400).json({ error: "Invalid action" });

  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }
}
