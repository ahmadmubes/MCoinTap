import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {

    const page = parseInt(req.query.page || "1");
    const limit = 10;
    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from("users")
      .select("telegram_id, username, balance, referral_count")
      .order("balance", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // ranking global (top 1 bonus logic bisa pakai ini nanti)
    const { data: top1 } = await supabase
      .from("users")
      .select("telegram_id, balance")
      .order("balance", { ascending: false })
      .limit(1)
      .maybeSingle();

    return res.status(200).json({
      success: true,
      page,
      data,
      top1
    });

  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}
