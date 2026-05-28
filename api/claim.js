import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BOT_TOKEN = process.env.BOT_TOKEN;

const REWARD = 100;
const COOLDOWN = 15000;
const MAX_DAILY = 20;

function today() {
  return new Date().toDateString();
}

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

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { initData } = req.body || {};

    if (!initData) {
      return res.status(400).json({ error: "Missing initData" });
    }

    // VERIFY
    const valid = verifyTelegram(initData);
    if (!valid) {
      return res.status(403).json({ error: "Invalid Telegram" });
    }

    const params = new URLSearchParams(initData);
    const tgUser = JSON.parse(params.get("user"));

    const telegram_id = tgUser.id;

    const ref = params.get("start_param") || params.get("ref");

    // GET USER
    let { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegram_id)
      .maybeSingle();

    // CREATE USER JIKA BELUM ADA
    if (!user) {

      const { data: newUser, error } = await supabase
        .from("users")
        .insert({
          telegram_id,
          balance: 0,
          daily_count: 0,
          last_claim: null,
          last_reset: today(),
          ref_by: null,
          referral_count: 0
        })
        .select()
        .maybeSingle();

      if (error) {
        return res.status(500).json({ error: "Insert user gagal" });
      }

      user = newUser;
    }

    // 🔥 FIX PENTING: REFERRAL DIPINDAH KE SINI (SETELAH USER ADA)
    if (ref && ref != telegram_id) {

      const { data: refUser } = await supabase
        .from("users")
        .select("telegram_id, balance, referral_count")
        .eq("telegram_id", ref)
        .maybeSingle();

      if (refUser) {

        // update user baru
        await supabase
          .from("users")
          .update({
            ref_by: ref,
            balance: (user.balance || 0) + 200
          })
          .eq("telegram_id", telegram_id);

        // update referrer
        await supabase
          .from("users")
          .update({
            balance: (refUser.balance || 0) + 500,
            referral_count: (refUser.referral_count || 0) + 1
          })
          .eq("telegram_id", ref);
      }
    }

    const now = Date.now();

    // RESET DAILY
    if (user.last_reset !== today()) {
      await supabase
        .from("users")
        .update({
          daily_count: 0,
          last_reset: today()
        })
        .eq("telegram_id", telegram_id);

      user.daily_count = 0;
    }

    // COOLDOWN
    if (user.last_claim) {
      const diff = now - new Date(user.last_claim).getTime();

      if (diff < COOLDOWN) {
        return res.status(429).json({
          error: "Cooldown aktif",
          cooldown_left: Math.ceil((COOLDOWN - diff) / 1000)
        });
      }
    }

    // LIMIT
    if (user.daily_count >= MAX_DAILY) {
      return res.status(403).json({ error: "Limit harian habis" });
    }

    const newBalance = (user.balance || 0) + REWARD;
    const newCount = (user.daily_count || 0) + 1;

    const { data: updated } = await supabase
      .from("users")
      .update({
        balance: newBalance,
        daily_count: newCount,
        last_claim: new Date().toISOString()
      })
      .eq("telegram_id", telegram_id)
      .select()
      .maybeSingle();

    return res.status(200).json({
      success: true,
      reward: REWARD,
      balance: updated?.balance ?? newBalance,
      remaining_today: MAX_DAILY - newCount
    });

  } catch (err) {
    console.log("SERVER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
