const music = require("../music/musicManager");

module.exports = {
  name: "play",
  async execute(message, args) {
    if (!args.length)
      return message.reply("Provide song name or URL.");

    music.playSong(message, args.join(" "));
  }
};
