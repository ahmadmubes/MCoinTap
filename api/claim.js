
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_ANON_KEY
);

export default async function handler(req,res){

const { initData } = req.body;

const params = new URLSearchParams(initData);
const user = JSON.parse(params.get("user"));

const telegram_id = user.id;

let { data:u } = await supabase
.from("users")
.select("*")
.eq("telegram_id",telegram_id)
.maybeSingle();

if(!u){

const ref = "REF" + telegram_id;

await supabase
.from("users")
.insert({
telegram_id,
username:user.username || "",
referral_code:ref
});

const result = await supabase
.from("users")
.select("*")
.eq("telegram_id",telegram_id)
.single();

u = result.data;
}

const reward = 10;

const newBalance = (u.balance || 0) + reward;

await supabase
.from("users")
.update({
balance:newBalance,
ad_watch_count:(u.ad_watch_count || 0)+1
})
.eq("telegram_id",telegram_id);

return res.json({
success:true,
message:"+10 point from ads",
balance:newBalance
});

}
