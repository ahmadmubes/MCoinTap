let balances = {};

export default function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { telegram_id } = req.body || {};

    if (!telegram_id) {
      return res.status(400).json({ error: "No user" });
    }

    if (!balances[telegram_id]) {
      balances[telegram_id] = 0;
    }

    balances[telegram_id] += 100;

    return res.status(200).json({
      success: true,
      balance: balances[telegram_id]
    });

  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      detail: err.message
    });
  }
}
