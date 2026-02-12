const music = require("../music/musicManager");

module.exports = {
  name: "queue",
  execute(message) {
    music.showQueue(message);
  }
};
