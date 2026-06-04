
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

const { data:u } = await supabase
.from("users")
.select("*")
.eq("telegram_id",telegram_id)
.single();

const rewards = [5,10,20,50,100];
const reward = rewards[Math.floor(Math.random()*rewards.length)];

await supabase
.from("users")
.update({
balance:u.balance + reward,
spin_count:(u.spin_count || 0)+1
})
.eq("telegram_id",telegram_id);

return res.json({
success:true,
message:`Spin reward +${reward}`
});

}
