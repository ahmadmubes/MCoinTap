
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_ANON_KEY
);

export default async function handler(req,res){

if(req.method !== "POST"){
return res.status(405).json({error:"Method not allowed"});
}

try{

const { telegram_id,dana } = req.body;

const { data:user } = await supabase
.from("users")
.select("*")
.eq("telegram_id",telegram_id)
.single();

if(user.balance < 5000){
return res.status(400).json({
error:"Minimum withdraw 5000"
});
}

await supabase
.from("users")
.update({
balance:user.balance - 5000
})
.eq("telegram_id",telegram_id);

await supabase
.from("withdraw_requests")
.insert({
telegram_id,
dana,
amount:5000,
status:"pending"
});

return res.json({
success:true
});

}catch(err){

return res.status(500).json({
error:err.message
});

}

}
