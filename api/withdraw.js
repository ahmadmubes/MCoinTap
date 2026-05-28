import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const MIN_WITHDRAW = 5000;

export default async function handler(req, res) {
  try {

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { telegram_id, dana } = req.body;

    if (!telegram_id || !dana) {
      return res.status(400).json({ error: "Missing data" });
    }

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegram_id)
      .maybeSingle();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.balance < MIN_WITHDRAW) {
      return res.status(403).json({
        error: "Minimal withdraw 5000 coin"
      });
    }

    // kurangi balance
    await supabase
      .from("users")
      .update({
        balance: user.balance - MIN_WITHDRAW
      })
      .eq("telegram_id", telegram_id);

    return res.status(200).json({
      success: true,
      message: "Withdraw request berhasil",
      dana,
      amount: MIN_WITHDRAW
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }
}
