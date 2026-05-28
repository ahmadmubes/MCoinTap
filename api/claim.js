export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { telegram_id } = req.body || {};

    if (!telegram_id) {
      return res.status(400).json({ error: "No user" });
    }

    const REWARD = 100;

    // simpan sementara memory server
    global._balances = global._balances || {};
    global._last = global._last || {};

    const now = Date.now();

    if (
      global._last[telegram_id] &&
      now - global._last[telegram_id] < 10000
    ) {
      return res.status(429).json({ error: "Cooldown" });
    }

    global._last[telegram_id] = now;

    if (!global._balances[telegram_id]) {
      global._balances[telegram_id] = 0;
    }

    global._balances[telegram_id] += REWARD;

    return res.status(200).json({
      success: true,
      balance: global._balances[telegram_id]
    });

  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      detail: err.message
    });
  }
}
