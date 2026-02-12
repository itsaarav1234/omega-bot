const music = require("../music/musicManager");

module.exports = {
  name: "skip",
  execute(message) {
    music.skip(message);
  }
};
