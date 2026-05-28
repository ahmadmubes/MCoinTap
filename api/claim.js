let db = {};

const REWARD = 100;
const COOLDOWN = 15000; // 15 detik
const MAX_DAILY = 20;

function getToday() {
  return new Date().toDateString();
}

export default function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { telegram_id } = req.body || {};

  if (!telegram_id) {
    return res.status(400).json({ error: "No user" });
  }

  const now = Date.now();

  if (!db[telegram_id]) {
    db[telegram_id] = {
      balance: 0,
      lastClaim: 0,
      count: 0,
      day: getToday()
    };
  }

  const user = db[telegram_id];

  // reset harian
  if (user.day !== getToday()) {
    user.count = 0;
    user.day = getToday();
  }

  // cooldown
  if (now - user.lastClaim < COOLDOWN) {
    return res.status(429).json({
      error: "Cooldown aktif",
      cooldown_left: Math.ceil((COOLDOWN - (now - user.lastClaim)) / 1000)
    });
  }

  // limit harian
  if (user.count >= MAX_DAILY) {
    return res.status(403).json({
      error: "Limit harian habis"
    });
  }

  // update
  user.balance += REWARD;
  user.lastClaim = now;
  user.count += 1;

  return res.status(200).json({
    success: true,
    reward: REWARD,
    balance: user.balance,
    remaining_today: MAX_DAILY - user.count
  });
}
