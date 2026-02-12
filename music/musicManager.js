const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection
} = require("@discordjs/voice");

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const play = require("play-dl");
const prism = require("prism-media");

const queues = new Map();

async function playSong(message, query) {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.reply("Join a voice channel first 🎵");

  let song;

  if (play.yt_validate(query) === "video") {
    const info = await play.video_info(query);
    song = {
  title: info.video_details.title,
  url: query,
  duration: info.video_details.durationInSec,
  thumbnail: info.video_details.thumbnails[0].url
};

  } else {
    const result = await play.search(query, { limit: 1 });
    if (!result.length) return message.reply("No results found.");
   song = {
  title: result[0].title,
  url: result[0].url,
  duration: result[0].durationInSec,
  thumbnail: result[0].thumbnails[0].url
};

  }

  let queue = queues.get(message.guild.id);

  if (!queue) {
    queue = {
      songs: [],
      player: createAudioPlayer(),
      connection: null,
      loop: false,
      volume: 1,
      filter: "none"
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
    startPlaying(message.guild.id, message.channel);
  }

  message.reply(`🎵 Added: **${song.title}**`);
}

async function startPlaying(guildId, textChannel = null) {
  const queue = queues.get(guildId);
  if (!queue || !queue.songs.length) return;

  const stream = await play.stream(queue.songs[0].url);

  let audioStream = stream.stream;

  // 🎚 FILTERS
  if (queue.filter !== "none") {
    let args = [];

    switch (queue.filter) {
      case "bass":
        args = ["-af", "bass=g=15"];
        break;
      case "nightcore":
        args = ["-af", "asetrate=48000*1.25,aresample=48000,atempo=1.1"];
        break;
      case "vaporwave":
        args = ["-af", "asetrate=48000*0.8,aresample=48000,atempo=0.9"];
        break;
      case "8d":
        args = ["-af", "apulsator=hz=0.08"];
        break;
      case "reverb":
        args = ["-af", "aecho=0.8:0.9:1000:0.3"];
        break;
    }

    audioStream = audioStream.pipe(new prism.FFmpeg({
      args: ["-analyzeduration", "0", "-loglevel", "0", "-f", "s16le", "-ar", "48000", "-ac", "2", ...args]
    }));
  }

  const resource = createAudioResource(audioStream, {
    inputType: stream.type,
    inlineVolume: true
  });

  resource.volume.setVolume(queue.volume);
  queue.player.play(resource);

  if (textChannel) sendNowPlaying(textChannel, queue);
}
function sendNowPlaying(channel, queue) {
  const song = queue.songs[0];

  const embed = new EmbedBuilder()
    .setColor("#8e44ad")
    .setTitle("🎵 Now Playing")
    .setDescription(`**${song.title}**`)
    .setThumbnail(song.thumbnail || null)
    .addFields(
      { name: "⏱ Duration", value: formatDuration(song.duration), inline: true },
      { name: "🔁 Loop", value: queue.loop ? "ON" : "OFF", inline: true },
      { name: "🔊 Volume", value: `${Math.round(queue.volume * 100)}%`, inline: true },
      { name: "🎚 Filter", value: queue.filter, inline: true }
    )
    .setFooter({ text: "Omega Premium Music System" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("pause")
      .setEmoji("⏸")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("resume")
      .setEmoji("▶")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("skip")
      .setEmoji("⏭")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("stop")
      .setEmoji("⏹")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("loop")
      .setEmoji("🔁")
      .setStyle(ButtonStyle.Secondary)
  );

  channel.send({ embeds: [embed], components: [row] });
}


function handleButtons(interaction) {
  const queue = queues.get(interaction.guild.id);
  if (!queue) return interaction.reply({ content: "Nothing playing.", ephemeral: true });

  switch (interaction.customId) {
    case "pause":
      queue.player.pause();
      break;
    case "resume":
      queue.player.unpause();
      break;
    case "skip":
      queue.player.stop();
      break;
    case "stop":
      queue.connection.destroy();
      queues.delete(interaction.guild.id);
      break;
    case "loop":
      queue.loop = !queue.loop;
      break;
  }

  interaction.reply({ content: "Updated 🎵", ephemeral: true });
}

function setFilter(message, filterName) {
  const queue = queues.get(message.guild.id);
  if (!queue) return message.reply("Nothing playing.");

  queue.filter = filterName;
  startPlaying(message.guild.id);
  message.reply(`🎚 Filter set to **${filterName}**`);
}

module.exports = {
  playSong,
  handleButtons,
  setFilter
};
function formatDuration(seconds) {
  if (!seconds) return "LIVE";

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return `${m}:${s.toString().padStart(2, "0")}`;
}
