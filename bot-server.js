
import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot(process.env.BOT_TOKEN,{
polling:true
});

bot.onText(/\/start/, async(msg)=>{

const url = process.env.WEBHOOK_URL;

bot.sendMessage(msg.chat.id,
"🚀 MCoinTap Ready",
{
reply_markup:{
inline_keyboard:[
[
{
text:"OPEN APP",
web_app:{
url
}
}
]
]
}
}
);

});

console.log("BOT RUNNING");
