import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {

    const page = Math.max(parseInt(req.query.page || "1"), 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    // GET LEADERBOARD
    const { data, error } = await supabase
      .from("users")
      .select("telegram_id, username, balance, referral_count, level")
      .order("balance", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    // GET TOP 1 (SAFE)
    const { data: top1Data } = await supabase
      .from("users")
      .select("telegram_id, username, balance")
      .order("balance", { ascending: false })
      .limit(1);

    const top1 = top1Data && top1Data.length > 0 ? top1Data[0] : null;

    // ADD RANKING NUMBER
    const rankedData = (data || []).map((u, i) => ({
      rank: offset + i + 1,
      telegram_id: u.telegram_id,
      username: u.username || "anonymous",
      balance: u.balance || 0,
      referral_count: u.referral_count || 0,
      level: u.level || 1
    }));

    return res.status(200).json({
      success: true,
      page,
      limit,
      data: rankedData,
      top1
    });

  } catch (err) {
    console.log("LEADERBOARD ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
}
