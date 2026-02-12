const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection
} = require("@discordjs/voice");

const play = require("play-dl");

const queues = new Map();

async function playSong(message, query) {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.reply("Join a voice channel first 🎵");

  let song;

  // Detect URL or search
  if (play.yt_validate(query) === "video") {
    const info = await play.video_info(query);
    song = {
      title: info.video_details.title,
      url: query
    };
  } else {
    const result = await play.search(query, { limit: 1 });
    if (!result.length) return message.reply("No results found.");
    song = {
      title: result[0].title,
      url: result[0].url
    };
  }

  let queue = queues.get(message.guild.id);

  if (!queue) {
    queue = {
      songs: [],
      player: createAudioPlayer(),
      connection: null,
      loop: false,
      volume: 1
    };

    queues.set(message.guild.id, queue);

    queue.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator
    });

    queue.connection.subscribe(queue.player);

    queue.player.on(AudioPlayerStatus.Idle, () => {
      if (!queue.loop) queue.songs.shift();

      if (queue.songs.length > 0) {
        startPlaying(message.guild.id);
      } else {
        queue.connection.destroy();
        queues.delete(message.guild.id);
      }
    });
  }

  queue.songs.push(song);

  if (queue.songs.length === 1) {
    startPlaying(message.guild.id);
  }

  message.reply(`🎵 Added: **${song.title}**`);
}

async function startPlaying(guildId) {
  const queue = queues.get(guildId);
  if (!queue || !queue.songs.length) return;

  const stream = await play.stream(queue.songs[0].url);

  const resource = createAudioResource(stream.stream, {
    inputType: stream.type,
    inlineVolume: true
  });

  resource.volume.setVolume(queue.volume);
  queue.player.play(resource);
}

function skip(message) {
  const queue = queues.get(message.guild.id);
  if (!queue) return message.reply("Nothing playing.");
  queue.player.stop();
  message.reply("⏭ Skipped.");
}

function stop(message) {
  const queue = queues.get(message.guild.id);
  if (!queue) return message.reply("Nothing playing.");

  queue.connection.destroy();
  queues.delete(message.guild.id);

  message.reply("🛑 Stopped.");
}

function setLoop(message) {
  const queue = queues.get(message.guild.id);
  if (!queue) return message.reply("Nothing playing.");

  queue.loop = !queue.loop;
  message.reply(`🔁 Loop ${queue.loop ? "Enabled" : "Disabled"}`);
}

function setVolume(message, amount) {
  const queue = queues.get(message.guild.id);
  if (!queue) return message.reply("Nothing playing.");

  if (isNaN(amount) || amount < 1 || amount > 100)
    return message.reply("Volume must be between 1–100");

  queue.volume = amount / 100;
  message.reply(`🔊 Volume set to ${amount}%`);
}

function showQueue(message) {
  const queue = queues.get(message.guild.id);
  if (!queue || !queue.songs.length)
    return message.reply("Queue is empty.");

  const list = queue.songs
    .map((song, i) => `${i + 1}. ${song.title}`)
    .join("\n");

  message.reply(`📜 Queue:\n${list}`);
}

module.exports = {
  playSong,
  skip,
  stop,
  setLoop,
  setVolume,
  showQueue
};
