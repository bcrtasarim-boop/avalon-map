const { Client, GatewayIntentBits, SlashCommandBuilder, Routes, EmbedBuilder } = require("discord.js");
const { REST } = require("@discordjs/rest");
const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const data = require("./data.json"); // Local JSON kullanımı

// ----- Uptime Server -----
const app = express();
app.get("/", (req, res) => res.send("Bot çalışıyor ✅"));
app.listen(process.env.PORT || 3000, () => console.log("Uptime server running"));

// ----- Discord Client -----
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ----- Slash Command Register (Guild) -----
const commands = [
  new SlashCommandBuilder()
    .setName("map")
    .setDescription("Harita bilgilerini gösterir")
    .addStringOption(option =>
      option.setName("isim")
        .setDescription("Harita ismi")
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log("Slash komutlar güncelleniyor...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("Slash komutlar güncellendi ✅");
  } catch (err) {
    console.error(err);
  }
})();

// ----- Icon Mapping -----
const iconMap = {
  BLUE: { name: "Mavi", url: process.env.BASE_URL + "icons/T.png", type: "chest" },
  GREEN: { name: "Yeşil", url: process.env.BASE_URL + "icons/V.png", type: "chest" },
  GOLD: { name: "Altın", url: process.env.BASE_URL + "icons/Z.png", type: "chest" },
  DUNGEON: { name: "Zindan", url: process.env.BASE_URL + "icons/D.png", type: "dungeon" },
  ROCK: { name: "Kaya", url: process.env.BASE_URL + "icons/S.png", type: "resource" },
  LOGS: { name: "Odun", url: process.env.BASE_URL + "icons/W.png", type: "resource" },
  ORE: { name: "Cevher", url: process.env.BASE_URL + "icons/K.png", type: "resource" },
  HIRE: { name: "Deri", url: process.env.BASE_URL + "icons/P.png", type: "resource" },
  COTTON: { name: "Pamuk", url: process.env.BASE_URL + "icons/M.png", type: "resource" }
};

// ----- Normalize Fonksiyonu -----
function normalize(str) {
  return str.toLowerCase().replace(/[-\s]+/g, " ").trim();
}

// ----- Slash Command -----
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "map") {
    await interaction.deferReply();
    const inputName = interaction.options.getString("isim");
    const maps = data;

    const map = maps.find(m => normalize(m.name) === normalize(inputName));
    if (!map) return interaction.editReply("Harita bulunamadı. Lütfen doğru isim girin.");

    const chests = [];
    const dungeons = [];
    const resources = [];

    map.icons.forEach(icon => {
      const info = iconMap[icon.alt];
      if (!info) return;

      if (info.type === "chest") {
        const count = icon.badge && icon.badge > 1 ? ` (${icon.badge})` : "";
        chests.push(`${info.name}${count}`);
      } else if (info.type === "dungeon") {
        dungeons.push(info.name);
      } else if (info.type === "resource") {
        resources.push(info.name);
      }
    });

    const embed = new EmbedBuilder()
      .setTitle(`Harita: ${map.name}`)
      .setDescription(`Tier: ${map.tier}`)
      .addFields(
        { name: "Chestler", value: chests.join(", ") || "Yok", inline: true },
        { name: "Zindanlar", value: dungeons.join(", ") || "Yok", inline: true },
        { name: "Kaynaklar", value: resources.join(", ") || "Yok", inline: true }
      )
      .setImage(process.env.BASE_URL + map.img)
      .setColor(0x00AE86);

    await interaction.editReply({ embeds: [embed] });
  }
});

client.once("ready", () => console.log(`Bot hazır ✅ ${client.user.tag}`));
client.login(process.env.BOT_TOKEN);
