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
      .map(([key, value]) => `${key}=${value}`)
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
      return res.status(405).json({
        error: "Method not allowed"
      });
    }

    const { initData } = req.body || {};

    if (!initData) {
      return res.status(400).json({
        error: "Missing initData"
      });
    }

    // verify telegram
    const valid = verifyTelegram(initData);

    if (!valid) {
      return res.status(403).json({
        error: "Invalid Telegram"
      });
    }

    const params = new URLSearchParams(initData);

    const tgUser = JSON.parse(params.get("user"));

    const telegram_id = tgUser.id;

    // ambil user
    let { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegram_id)
      .maybeSingle();

    // kalau belum ada → create
    if (!user) {

      const insertResult = await supabase
        .from("users")
        .insert({
          telegram_id,
          balance: 0,
          daily_count: 0,
          last_claim: null,
          last_reset: today()
        })
        .select()
        .single();

      user = insertResult.data;

      if (!user) {
        return res.status(500).json({
          error: "Create user failed"
        });
      }
    }

    const now = Date.now();

    // reset harian
    if (user.last_reset !== today()) {

      user.daily_count = 0;

      await supabase
        .from("users")
        .update({
          daily_count: 0,
          last_reset: today()
        })
        .eq("telegram_id", telegram_id);
    }

    // cooldown
    if (user.last_claim) {

      const diff =
        now - new Date(user.last_claim).getTime();

      if (diff < COOLDOWN) {

        return res.status(429).json({
          error: "Cooldown aktif",
          cooldown_left: Math.ceil(
            (COOLDOWN - diff) / 1000
          )
        });
      }
    }

    // limit
    if (user.daily_count >= MAX_DAILY) {

      return res.status(403).json({
        error: "Limit harian habis"
      });
    }

    const newBalance =
      (user.balance || 0) + REWARD;

    const newCount =
      (user.daily_count || 0) + 1;

    const { data: updated } = await supabase
      .from("users")
      .update({
        balance: newBalance,
        daily_count: newCount,
        last_claim: new Date().toISOString()
      })
      .eq("telegram_id", telegram_id)
      .select()
      .single();

    return res.status(200).json({
      success: true,
      reward: REWARD,
      balance: updated.balance,
      remaining_today:
        MAX_DAILY - updated.daily_count
    });

  } catch (err) {

    console.log("SERVER ERROR:", err);

    return res.status(500).json({
      error: "Server error"
    });
  }
}
