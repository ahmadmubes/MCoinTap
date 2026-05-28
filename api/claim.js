let balances = {};
let lastClaim = {};

const REWARD = 100;
const COOLDOWN = 15000;

export default function handler(req,res){

if(req.method !== "POST"){
  return res.status(405).json({error:"Method not allowed"});
}

const { telegram_id } = req.body;

if(!telegram_id){
  return res.status(400).json({error:"No user"});
}

const now = Date.now();

if(lastClaim[telegram_id] && now - lastClaim[telegram_id] < COOLDOWN){
  return res.status(429).json({error:"Cooldown aktif"});
}

lastClaim[telegram_id] = now;

if(!balances[telegram_id]){
  balances[telegram_id] = 0;
}

balances[telegram_id] += REWARD;

return res.status(200).json({
  success:true,
  reward:REWARD,
  balance:balances[telegram_id]
});

}
