const { Client, GatewayIntentBits, SlashCommandBuilder, Routes, EmbedBuilder } = require("discord.js");
const { REST } = require("@discordjs/rest");
const express = require("express");
const dotenv = require("dotenv");
const maps = require("./data.json"); // index.js ile aynı klasörde

dotenv.config();

// ----- Uptime Server -----
const app = express();
app.get("/", (req, res) => res.send("Bot çalışıyor ✅"));
app.listen(process.env.PORT || 3000, () => console.log("Uptime server running"));

// ----- Discord Client -----
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ----- Helper Functions -----
function normalize(str) {
  return str.toLowerCase().replace(/[-\s]+/g, " ").trim();
}

function getImageUrl(map) {
  const fileName = map.img;
  return "https://avalonroads-97617.web.app/img_webp/" + fileName;
}

// ----- OPTIMIZASYON ADIMI: Veriyi Başlangıçta Sadece Bir Kez İşleme -----
console.log("Harita verisi optimize ediliyor...");
const searchableMaps = maps.map(map => {
  const normalized = normalize(map.name);
  return {
    ...map, // Orijinal map verilerini koru
    searchParts: normalized.split(' ') // Aramada kullanılacak parçaları başta hazırla
  };
});
console.log(`${searchableMaps.length} harita arama için hazırlandı.`);

// ----- Slash Command Register -----
const commands = [
  new SlashCommandBuilder()
    .setName("map")
    .setDescription("Harita bilgilerini gösterir")
    .addStringOption(option =>
      option.setName("isim")
        .setDescription("Harita ismi (Örn: casitos-ali)")
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

// ----- GÜNCELLENMİŞ Slash Command -----
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "map") return;

  try {
    // Zaman aşımı sorununu engellemek için en başa alındı.
    await interaction.deferReply();

    const inputName = interaction.options.getString("isim");
    const normalizedInput = normalize(inputName);
    const inputParts = normalizedInput.split(' ');

    // Kullanıcının "kelime1-kelime2" formatında girdiğini varsayıyoruz.
    if (inputParts.length < 2) {
      await interaction.editReply("Lütfen aramanızı `kelime1-kelime2` formatında yapın (Örn: `casitos-ali`).");
      return;
    }
    const inputWord1 = inputParts[0];
    const inputWord2_prefix = inputParts[1];

    // Optimize edilmiş ve hızlı arama
    const matches = searchableMaps.filter(map => {
      if (map.searchParts.length < 2) return false;
      
      const mapWord1 = map.searchParts[0];
      const mapWord2 = map.searchParts[1];
      
      return mapWord1 === inputWord1 && mapWord2.startsWith(inputWord2_prefix);
    });

    // 1. Durum: Hiç harita bulunamadı
    if (matches.length === 0) {
      await interaction.editReply("Harita bulunamadı. Lütfen doğru isim girdiğinizden emin olun.");
      return;
    }

    // 2. Durum: Birden fazla sonuç bulundu (Çakışma)
    if (matches.length > 1) {
      const matchedNames = matches.map(m => `\`${m.name}\``).join("\n");
      await interaction.editReply(
        `Aramanızla eşleşen birden fazla harita bulundu. Lütfen daha spesifik olun:\n\n${matchedNames}`
      );
      return;
    }
    
    // 3. Durum: Tam olarak bir sonuç bulundu (Başarılı)
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

  } catch (err) {
    console.error("Ana işlem bloğunda bir hata oluştu:", err);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: 'Komut işlenirken bir hata oluştu!', embeds: [] });
      } else {
        await interaction.reply({ content: 'Komut işlenirken bir hata oluştu!', ephemeral: true });
      }
    } catch (err2) {
      console.error("Hata mesajı bile gönderilemedi:", err2);
    }
  }
});

client.once("ready", () => console.log(`Bot hazır ✅ ${client.user.tag}`));
client.login(process.env.BOT_TOKEN);
