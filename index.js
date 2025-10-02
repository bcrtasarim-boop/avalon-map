// index.js
const { Client, GatewayIntentBits, SlashCommandBuilder, Routes, EmbedBuilder } = require("discord.js");
const { REST } = require("@discordjs/rest");
const express = require("express");
const dotenv = require("dotenv");
const maps = require("./data.json"); // Local JSON

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
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("Slash komutlar güncellendi ✅");
  } catch (err) { console.error(err); }
})();

// ----- Icon Mapping -----
const iconMap = {
  BLUE: { name: "Mavi", url: "https://avalonroads-97617.web.app/icons/T.png", type: "chest" },
  GREEN: { name: "Yeşil", url: "https://avalonroads-97617.web.app/icons/V.png", type: "chest" },
  GOLD: { name: "Altın", url: "https://avalonroads-97617.web.app/icons/Z.png", type: "chest" },
  DUNGEON: { name: "Zindan", url: "https://avalonroads-97617.web.app/icons/D.png", type: "dungeon" },
  ROCK: { name: "Kaya", url: "https://avalonroads-97617.web.app/icons/S.png", type: "resource" },
  LOGS: { name: "Odun", url: "https://avalonroads-97617.web.app/icons/W.png", type: "resource" },
  ORE: { name: "Cevher", url: "https://avalonroads-97617.web.app/icons/K.png", type: "resource" },
  HIRE: { name: "Deri", url: "https://avalonroads-97617.web.app/icons/P.png", type: "resource" },
  COTTON: { name: "Pamuk", url: "https://avalonroads-97617.web.app/icons/M.png", type: "resource" }
};

// ----- Normalize Fonksiyonu -----
function normalize(str) {
  return str.toLowerCase().replace(/[-\s]+/g, " ").trim();
}

// ----- Slash Command -----
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "map") {
    await interaction.deferReply().catch(console.error);
    const inputName = interaction.options.getString("isim");
    console.log("Kullanıcı girdi:", inputName);

    const inputNorm = normalize(inputName);
    const map = maps.find(m => normalize(m.name).includes(inputNorm));
    if (!map) {
      await interaction.editReply("Harita bulunamadı. Lütfen doğru isim girin.").catch(console.error);
      return;
    }

    const chests = [];
    const dungeons = [];
    const resources = [];

    map.icons.forEach(icon => {
      const info = iconMap[icon.alt];
      if (!info) return;

      if (info.type === "chest") {
        // Badge yoksa 1 göster
        const count = icon.badge ? ` (${icon.badge})` : " (1)";
        chests.push(`${info.name}${count}`);
      } else if (info.type === "dungeon") {
        dungeons.push(info.name);
      } else if (info.type === "resource") {
        resources.push(info.name);
      }
    });

    // Embed image URL
    const imageUrl = "https://avalonroads-97617.web.app/" + map.img.replace(/^\/+/, "");

    // Hata yakalama ile embed
    try {
      const embed = new EmbedBuilder()
        .setTitle(`Harita: ${map.name}`)
        .setDescription(`Tier: ${map.tier}`)
        .addFields(
          { name: "Chestler", value: chests.join(", ") || "Yok", inline: true },
          { name: "Zindanlar", value: dungeons.join(", ") || "Yok", inline: true },
          { name: "Kaynaklar", value: resources.join(", ") || "Yok", inline: true }
        )
        .setImage(imageUrl)
        .setColor(0x00AE86);

      console.log("Embed URL:", imageUrl);
      await interaction.editReply({ embeds: [embed] });
      console.log("Harita gönderildi:", map.name);
    } catch (err) {
      console.error("Embed gönderilemedi:", err);
      try {
        await interaction.followUp("Bir hata oluştu, harita gösterilemedi.");
      } catch (err2) {
        console.error("Fallback mesaj da gönderilemedi:", err2);
      }
    }
  }
});

client.once("ready", () => console.log(`Bot hazır ✅ ${client.user.tag}`));
client.login(process.env.BOT_TOKEN);
