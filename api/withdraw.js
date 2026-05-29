import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const MIN_WITHDRAW = 5000;

async function sendTelegram(text) {

  await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text
      })
    }
  );

}

export default async function handler(req, res) {

  try {

    if(req.method !== "POST"){
      return res.status(405).json({
        error:"Method not allowed"
      });
    }

    const {
      telegram_id,
      dana
    } = req.body;

    if(!telegram_id || !dana){
      return res.status(400).json({
        error:"Data tidak lengkap"
      });
    }

    // GET USER
    const { data:user } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegram_id)
      .maybeSingle();

    if(!user){
      return res.status(404).json({
        error:"User tidak ditemukan"
      });
    }

    // MINIMUM
    if(user.balance < MIN_WITHDRAW){
      return res.status(400).json({
        error:`Minimum withdraw ${MIN_WITHDRAW}`
      });
    }

    // POTONG BALANCE
    const newBalance = user.balance - MIN_WITHDRAW;

    await supabase
      .from("users")
      .update({
        balance:newBalance
      })
      .eq("telegram_id", telegram_id);

    // INSERT REQUEST
    const { data:wd } = await supabase
      .from("withdraw_requests")
      .insert({
        telegram_id,
        dana,
        amount: MIN_WITHDRAW,
        status:"pending"
      })
      .select()
      .maybeSingle();

    // 🔥 SEND TELEGRAM NOTIFICATION
    await sendTelegram(
`💸 NEW WITHDRAW REQUEST

User: ${telegram_id}
DANA: ${dana}
Amount: ${MIN_WITHDRAW}

Withdraw ID: ${wd.id}`
    );

    return res.status(200).json({
      success:true,
      message:"Withdraw request dikirim"
    });

  } catch(err){

    console.log(err);

    return res.status(500).json({
      error:"Server error"
    });

  }

}
