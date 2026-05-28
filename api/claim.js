import crypto from "crypto";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BOT_TOKEN = process.env.BOT_TOKEN; // dari BotFather
const REWARD = 100;
const COOLDOWN = 15000;
const MAX_DAILY = 20;

// verify telegram initData
function verifyTelegram(initData) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  urlParams.delete("hash");

  const dataCheckString = [...urlParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${key}=${val}`)
    .join("\n");

  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  return computedHash === hash;
}

function today() {
  return new Date().toDateString();
}

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { initData } = req.body || {};

  if (!initData) {
    return res.status(400).json({ error: "Missing initData" });
  }

  // 🔐 VERIFY TELEGRAM
  if (!verifyTelegram(initData)) {
    return res.status(403).json({ error: "Invalid Telegram data" });
  }

  // ambil user dari initData
  const urlParams = new URLSearchParams(initData);
  const user = JSON.parse(urlParams.get("user"));

  const telegram_id = user.id;
  const now = Date.now();

  // ambil user di DB
  let { data } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegram_id)
    .single();

  // create user jika belum ada
  if (!data) {
    const { data: newUser } = await supabase
      .from("users")
      .insert({
        telegram_id,
        balance: 0,
        daily_count: 0,
        last_claim: null,
        last_reset: null
      })
      .select()
      .single();

    data = newUser;
  }

  // cooldown
  if (data.last_claim) {
    const diff = now - new Date(data.last_claim).getTime();

    if (diff < COOLDOWN) {
      return res.status(429).json({
        error: "Cooldown aktif",
        cooldown_left: Math.ceil((COOLDOWN - diff) / 1000)
      });
    }
  }

  // reset harian
  if (data.last_reset !== today()) {
    data.daily_count = 0;
  }

  // limit harian
  if (data.daily_count >= MAX_DAILY) {
    return res.status(403).json({
      error: "Limit harian habis"
    });
  }

  const newBalance = (data.balance || 0) + REWARD;
  const newCount = (data.daily_count || 0) + 1;

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
    remaining_today: MAX_DAILY - updated.daily_count
  });
}
