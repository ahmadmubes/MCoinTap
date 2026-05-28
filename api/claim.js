import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BOT_TOKEN = process.env.BOT_TOKEN;

const REWARD = 100;
const EXP_GAIN = 20;
const LEVEL_UP_EXP = 200;

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
    if (!initData) return res.status(400).json({ error: "Missing initData" });

    if (!verifyTelegram(initData)) {
      return res.status(403).json({ error: "Invalid Telegram" });
    }

    const params = new URLSearchParams(initData);
    const tgUser = JSON.parse(params.get("user"));

    const telegram_id = tgUser.id;
    const username = tgUser.username || null;

    let { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegram_id)
      .maybeSingle();

    if (!user) {
      const { data: newUser } = await supabase
        .from("users")
        .insert({
          telegram_id,
          username,
          balance: 0,
          daily_count: 0,
          last_claim: null,
          last_reset: today(),
          level: 1,
          exp: 0
        })
        .select()
        .maybeSingle();

      user = newUser;
    }

    // COOLDOWN
    if (user.last_claim) {
      const diff = Date.now() - new Date(user.last_claim).getTime();
      if (diff < COOLDOWN) {
        return res.status(429).json({
          error: "Cooldown aktif",
          cooldown_left: Math.ceil((COOLDOWN - diff) / 1000)
        });
      }
    }

    // DAILY LIMIT
    if (user.daily_count >= MAX_DAILY) {
      return res.status(403).json({ error: "Limit harian habis" });
    }

    // DAILY MISSION CHECK (sekali per hari bonus exp)
    let bonusExp = 0;

    if (user.last_daily_check !== today()) {
      bonusExp = 50;

      await supabase
        .from("users")
        .update({
          last_daily_check: today()
        })
        .eq("telegram_id", telegram_id);
    }

    let newExp = (user.exp || 0) + EXP_GAIN + bonusExp;
    let newLevel = user.level || 1;

    if (newExp >= LEVEL_UP_EXP) {
      newLevel += 1;
      newExp = newExp - LEVEL_UP_EXP;
    }

    const newBalance = (user.balance || 0) + REWARD;
    const newCount = (user.daily_count || 0) + 1;

    const { data: updated } = await supabase
      .from("users")
      .update({
        balance: newBalance,
        daily_count: newCount,
        last_claim: new Date().toISOString(),
        exp: newExp,
        level: newLevel
      })
      .eq("telegram_id", telegram_id)
      .select()
      .maybeSingle();

    return res.status(200).json({
      success: true,
      reward: REWARD,
      balance: updated.balance,
      level: updated.level,
      exp: updated.exp,
      remaining_today: MAX_DAILY - newCount,
      cooldown: COOLDOWN / 1000,
      daily_bonus: bonusExp
    });

  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}
