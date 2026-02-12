const music = require("../music/musicManager");

module.exports = {
  name: "volume",
  execute(message, args) {
    music.setVolume(message, parseInt(args[0]));
  }
};
