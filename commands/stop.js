const music = require("../music/musicManager");

module.exports = {
  name: "stop",
  execute(message) {
    music.stop(message);
  }
};
