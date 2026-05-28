import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

// VERIFY TELEGRAM INIT DATA
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

    // 🔐 VERIFY TELEGRAM
    if (!verifyTelegram(initData)) {
      return res.status(403).json({ error: "Invalid Telegram" });
    }

    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user"));

    const telegram_id = user.id;

    // 🔥 ONLY ADMIN CAN ACCESS
    if (String(telegram_id) !== String(ADMIN_ID)) {
      return res.status(403).json({ error: "Not authorized admin" });
    }

    // =========================
    // ADMIN ACTIONS
    // =========================

    // GET USERS
    if (action === "get_users") {
      const { data } = await supabase
        .from("users")
        .select("*")
        .order("balance", { ascending: false })
        .limit(50);

      return res.json({ success: true, data });
    }

    // BAN USER
    if (action === "ban") {
      await supabase
        .from("users")
        .update({
          balance: 0,
          referral_count: 0
        })
        .eq("telegram_id", target_id);

      return res.json({ success: true, message: "User banned" });
    }

    // UNBAN USER
    if (action === "unban") {
      await supabase
        .from("users")
        .update({
          balance: 100
        })
        .eq("telegram_id", target_id);

      return res.json({ success: true, message: "User unbanned" });
    }

    // GET WITHDRAW
    if (action === "get_withdraw") {
      const { data } = await supabase
        .from("withdraw_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      return res.json({ success: true, data });
    }

    // APPROVE WITHDRAW
    if (action === "approve_withdraw") {
      await supabase
        .from("withdraw_requests")
        .update({ status: "approved" })
        .eq("id", withdraw_id);

      return res.json({ success: true });
    }

    // REJECT WITHDRAW + REFUND
    if (action === "reject_withdraw") {

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
