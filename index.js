import { Client, GatewayIntentBits, SlashCommandBuilder, Routes, EmbedBuilder } from "discord.js";
import fetch from "node-fetch";
import express from "express";
import dotenv from "dotenv";
import { REST } from "@discordjs/rest";

dotenv.config();

// ----- Uptime Server -----
const app = express();
app.get("/", (req, res) => res.send("Bot çalışıyor ✅"));
app.listen(process.env.PORT || 3000, () => console.log("Uptime server running"));

// ----- Discord Client -----
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ----- Slash Command Register -----
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
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("Slash komutlar güncellendi ✅");
  } catch (err) { console.error(err); }
})();

// ----- Map Verisi Cache -----
let mapCache = [];
let lastFetch = 0;
const cacheTTL = 5 * 60 * 1000; // 5 dakika

async function fetchMaps() {
  const now = Date.now();
  if (now - lastFetch < cacheTTL && mapCache.length) return mapCache;

  try {
    const res = await fetch(process.env.JSON_URL);
    const data = await res.json();
    mapCache = data;
    lastFetch = now;
    return mapCache;
  } catch (err) {
    console.error("Map verisi alınamadı:", err);
    return [];
  }
}

// ----- Icon ve Kategori Mapping -----
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

// ----- Normalize Fonksiyonu (case-insensitive + tire/boşluk) -----
function normalize(str) {
  return str.toLowerCase().replace(/-/g, " ").trim();
}

// ----- Slash Command -----
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "map") {
    await interaction.deferReply();
    const inputName = interaction.options.getString("isim");
    const maps = await fetchMaps();

    const map = maps.find(m => normalize(m.name) === normalize(inputName));
    if (!map) return interaction.editReply("Harita bulunamadı. Lütfen doğru isim girin veya /maps ile listeye bakın.");

    const chests = [];
    const dungeons = [];
    const resources = [];

    map.icons.forEach(icon => {
      const info = iconMap[icon.alt];
      if (!info) return;

      const count = icon.badge || 1;
      if (info.type === "chest") chests.push(`${info.name} (${count})`);
      else if (info.type === "dungeon") dungeons.push(`${info.name}`);
      else if (info.type === "resource") resources.push(`${info.name}`);
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
