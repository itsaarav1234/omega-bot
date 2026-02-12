require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
app.get("/", (req, res) => res.send("Omega Bot is Alive 👑"));
app.listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const prefix = "!";
client.commands = new Map();

// Load commands
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  // 👑 AUTO REACT
  if (content.includes("omega")) {
    message.react("👑").catch(() => {});
  }

  // 🤖 AI Reply When Mentioned (REMOVE THIS BLOCK IF SKIPPING AI)
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

  // ⛔ Stop if not command
  if (!content.startsWith(prefix)) return;

  // 🎯 COMMAND HANDLER
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


  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are Omega, an elite intelligent Discord bot." },
        { role: "user", content: message.content }
      ]
    });

    message.reply(response.choices[0].message.content.slice(0, 2000));
  } catch (err) {
    console.error(err);
  }
});

client.login(process.env.TOKEN);
