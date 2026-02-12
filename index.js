client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  // 👑 AUTO REACT
  if (content.includes("omega")) {
    message.react("👑").catch(() => {});
  }

  // 🤖 AI Reply When Mentioned
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


// 🎛 MUSIC BUTTON LISTENER (PASTE HERE)
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  const music = require("./music/musicManager");
  music.handleButtons(interaction);
});


client.login(process.env.TOKEN);
