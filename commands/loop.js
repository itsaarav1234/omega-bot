const music = require("../music/musicManager");

module.exports = {
  name: "loop",
  execute(message) {
    music.setLoop(message);
  }
};
