import TelegramBot from "node-telegram-bot-api";
import { createClient } from "@supabase/supabase-js";

const TOKEN = process.env.BOT_TOKEN;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// URL MINI APP
const MINIAPP_URL = "https://m-coin-tap.vercel.app/";
const ADMIN_URL = "https://m-coin-tap.vercel.app/admin.html";

const bot = new TelegramBot(TOKEN, {
  polling: false
});

// ==========================
// START COMMAND
// ==========================
bot.onText(/\/start/, async (msg) => {

  const chatId = msg.chat.id;
  const telegram_id = msg.from.id;

  // 🔥 CHECK ADMIN ROLE
  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("*")
    .eq("telegram_id", telegram_id)
    .maybeSingle();

  // ==========================
  // BUTTONS
  // ==========================
  const keyboard = [
    [
      {
        text: "🚀 Open Mini App",
        web_app: {
          url: MINIAPP_URL
        }
      }
    ]
  ];

  // 🔥 ONLY ADMIN SEE THIS
  if (adminRole) {
    keyboard.push([
      {
        text: "🛠 Admin Panel",
        web_app: {
          url: ADMIN_URL
        }
      }
    ]);
  }

  // SEND MESSAGE
  bot.sendMessage(
    chatId,
    `🪙 Welcome to MCoinTap PRO

ID: ${telegram_id}
Role: ${adminRole?.role || "user"}`,
    {
      reply_markup: {
        inline_keyboard: keyboard
      }
    }
  );

});

console.log("🔥 MCoinTap BOT RUNNING...");


console.log("Gunakan webhook untuk deploy production.");
