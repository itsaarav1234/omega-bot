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
  const embed = new EmbedBuilder()
    .setTitle("🎵 Now Playing")
    .setDescription(`**${queue.songs[0].title}**`)
    .setColor("Purple")
    .addFields(
      { name: "🔁 Loop", value: queue.loop ? "ON" : "OFF", inline: true },
      { name: "🎚 Filter", value: queue.filter, inline: true }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("pause").setLabel("⏸").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("resume").setLabel("▶").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("skip").setLabel("⏭").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("stop").setLabel("⏹").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("loop").setLabel("🔁").setStyle(ButtonStyle.Secondary)
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
