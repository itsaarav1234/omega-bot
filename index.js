const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});
require("dotenv").config();

const { Client, GatewayIntentBits, Collection } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const prefix = "!";
client.commands = new Collection();


// 👇 READY EVENT
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    activities: [{
      name: "Neon Premium Music",
      type: 2
    }],
    status: "online"
  });
});


// 👇 YOUR MESSAGE EVENT
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  if (content.includes("neon")) {
    message.react("👑").catch(() => {});
  }

  if (message.mentions.has(client.user) && process.env.OPENAI_KEY) {
    try {
      const OpenAI = require("openai");
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_KEY
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are Omega, elite Discord AI." },
          { role: "user", content: message.content }
        ]
      });

      await message.reply(response.choices[0].message.content.slice(0, 2000));
    } catch (err) {
      console.error("AI Error:", err);
    }
  }

  if (!content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  if (!client.commands.has(commandName)) return;

  try {
    await client.commands.get(commandName).execute(message, args);
  } catch (error) {
    console.error(error);
    message.reply("There was an error executing that command.");
  }
});


// 👇 BUTTON LISTENER
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  const music = require("./music/musicManager");
  music.handleButtons(interaction);
});


// 👇 LOGIN (ALWAYS LAST LINE)
client.login(process.env.TOKEN);
