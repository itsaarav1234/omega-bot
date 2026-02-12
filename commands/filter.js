const music = require("../music/musicManager");

module.exports = {
  name: "filter",
  execute(message, args) {
    if (!args[0]) 
      return message.reply("Available: bass, nightcore, vaporwave, 8d, reverb, none");

    music.setFilter(message, args[0]);
  }
};
