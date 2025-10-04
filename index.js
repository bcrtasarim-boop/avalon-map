const { Client, GatewayIntentBits, SlashCommandBuilder, Routes, EmbedBuilder } = require("discord.js");
const { REST } = require("@discordjs/rest");
const express = require("express");
const dotenv = require("dotenv");
const maps = require("./data.json"); // Temizlenmiş ve tekrar etmeyen verileri içeren data.json

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
        .setDescription("Harita ismi (Örn: firos-eno)")
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
  } catch (err) { console.error("Slash komutları güncellenirken hata:", err); }
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

// ----- Helper Functions -----
function normalize(str) {
  return str.toLowerCase().replace(/[-\s]+/g, " ").trim();
}

function getImageUrl(map) {
  try {
    let fileName = map.img;
    if (typeof fileName !== 'string' || fileName.trim() === '') {
      console.error("HATA: Geçersiz 'img' verisi:", map.img, "Harita:", map.name);
      return null;
    }
    if (fileName.startsWith("img/")) {
      fileName = fileName.substring(4);
    }
    const lastDotIndex = fileName.lastIndexOf('.');
    let baseName = (lastDotIndex !== -1) ? fileName.substring(0, lastDotIndex) : fileName;
    const finalFileName = baseName + ".webp";
    const finalUrl = "https://avalonroads-97617.web.app/img_webp/" + encodeURIComponent(finalFileName) + `?v=${Date.now()}`;
    return finalUrl;
  } catch (error) {
    console.error(`'${map.name}' için URL oluşturulurken hata oluştu:`, error);
    return null;
  }
}

// ----- Slash Command Handler (NİHAİ SÜRÜM) -----
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "map") return;

  try {
    await interaction.deferReply(); // ZAMAN AŞIMI HATASINI ENGELLEMEK İÇİN EN BAŞA ALINDI

    const inputName = interaction.options.getString("isim");
    const normalizedInput = normalize(inputName);
    const inputParts = normalizedInput.split(' ');

    if (inputParts.length < 2) {
      await interaction.editReply("Lütfen aramanızı `kelime1-kelime2` formatında yapın (Örn: `firos-eno`).");
      return;
    }
    const inputWord1 = inputParts[0];
    const inputWord2_prefix = inputParts[1];

    const matches = maps.filter(m => {
      const mapNameNormalized = normalize(m.name);
      const mapParts = mapNameNormalized.split(' ');
      if (mapParts.length < 2) return false;
      const mapWord1 = mapParts[0];
      const mapWord2 = mapParts[1];
      return mapWord1 === inputWord1 && mapWord2.startsWith(inputWord2_prefix);
    });

    if (matches.length === 0) {
      await interaction.editReply("Harita bulunamadı. Lütfen aramanızı kontrol edin.");
      return;
    }

    if (matches.length === 1) {
      const map = matches[0];
      const chests = [], dungeons = [], resources = [];
      (map.icons || []).forEach(icon => {
        const info = iconMap[icon.alt];
        if (!info) return;
        if (info.type === "chest") {
          const count = icon.badge ? ` (${icon.badge})` : " (1)";
          chests.push(`${info.name}${count}`);
        } else if (info.type === "dungeon") dungeons.push(info.name);
        else if (info.type === "resource") resources.push(info.name);
      });

      const embed = new EmbedBuilder()
        .setTitle(`Harita: ${map.name}`)
        .setDescription(`Tier: ${map.tier}`)
        .addFields(
          { name: "Chestler", value: chests.join(", ") || "Yok", inline: true },
          { name: "Zindanlar", value: dungeons.join(", ") || "Yok", inline: true },
          { name: "Kaynaklar", value: resources.join(", ") || "Yok", inline: true }
        )
        .setImage(getImageUrl(map))
        .setColor(0x00AE86);

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (matches.length > 1) {
      const matchedNames = matches.map(m => `\`${m.name}\``).join("\n");
      await interaction.editReply(
        `Aramanızla eşleşen birden fazla sonuç bulundu. Lütfen daha spesifik olun:\n\n${matchedNames}`
      );
      return;
    }
  } catch (err) {
    console.error("Ana işlem bloğunda hata oluştu:", err);
    try {
      // Zaten defer/reply yapıldığı için editReply ile hata mesajı gönderilir.
      await interaction.editReply("Bir hata oluştu, komut işlenemedi.");
    } catch (err2) {
      console.error("Hata mesajı bile gönderilemedi:", err2);
    }
  }
});

client.once("ready", () => console.log(`Bot hazır ✅ ${client.user.tag}`));
client.login(process.env.BOT_TOKEN);
