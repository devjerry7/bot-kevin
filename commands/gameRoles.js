// commands/gameRoles.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");

const handleGameRolesPanel = async (message) => {
  if (
    !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    return message.reply(
      `${EMOJI_ERROR} Apenas administradores podem postar o painel de jogos.`,
    );
  }

  // --- Lendo variáveis estéticas do .env ---
  const COLOR_BASE = process.env.COLOR_BASE
    ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
    : 0x00e5ff;
  const BANNER_URL = process.env.BANNER_URL;
  const EMOJI_PANEL_GAMES = process.env.EMOJI_PANEL_GAMES || "🎮";

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI_PANEL_GAMES} SELECIONE SEUS JOGOS`)
    .setDescription(
      "Clique nos botões abaixo para adicionar ou remover as tags de jogo no seu perfil.\n\n" +
        "Isso liberará o acesso aos canais específicos de cada game e você poderá ser notificado para jogar com a galera!",
    )
    .setColor(COLOR_BASE)
    .setImage(BANNER_URL)
    .setFooter({
      text: "Sistema de Auto-Role",
      iconURL: message.guild.iconURL(),
    });

  // Linha 1 (4 Botões)
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_role_ff")
      .setLabel("Free Fire")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(process.env.EMOJI_GAME_FF || "🔥"),
    new ButtonBuilder()
      .setCustomId("btn_role_val")
      .setLabel("Valorant")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(process.env.EMOJI_GAME_VAL || "🎯"),
    new ButtonBuilder()
      .setCustomId("btn_role_cs")
      .setLabel("CS:GO/2")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(process.env.EMOJI_GAME_CS || "🔫"),
    new ButtonBuilder()
      .setCustomId("btn_role_gta")
      .setLabel("GTA V")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(process.env.EMOJI_GAME_GTA || "🚗"),
  );

  // Linha 2 (4 Botões)
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_role_roblox")
      .setLabel("Roblox")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(process.env.EMOJI_GAME_ROBLOX || "🧱"),
    new ButtonBuilder()
      .setCustomId("btn_role_mine")
      .setLabel("Minecraft")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(process.env.EMOJI_GAME_MINE || "⛏️"),
    new ButtonBuilder()
      .setCustomId("btn_role_codenames")
      .setLabel("Codenames")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(process.env.EMOJI_GAME_CODENAMES || "🕵️"),
    new ButtonBuilder()
      .setCustomId("btn_role_amongus")
      .setLabel("Among Us")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(process.env.EMOJI_GAME_AMONGUS || "🔪"),
  );

  // Linha 3 (4 Botões Novos)
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_role_lol")
      .setLabel("League of Legends")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(process.env.EMOJI_GAME_LOL || "🪄"),
    new ButtonBuilder()
      .setCustomId("btn_role_plato")
      .setLabel("Plato")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(process.env.EMOJI_GAME_PLATO || "📱"),
    new ButtonBuilder()
      .setCustomId("btn_role_gartic")
      .setLabel("Gartic")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(process.env.EMOJI_GAME_GARTIC || "🎨"),
    new ButtonBuilder()
      .setCustomId("btn_role_bloodstrike")
      .setLabel("Bloodstrike")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(process.env.EMOJI_GAME_BLOODSTRIKE || "🩸"),
  );

  // Linha 4 (4 Botões Novos)
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_role_clash")
      .setLabel("Clash Royale")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(process.env.EMOJI_GAME_CLASH || "👑"),
    new ButtonBuilder()
      .setCustomId("btn_role_standoff")
      .setLabel("Standoff 2")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(process.env.EMOJI_GAME_STANDOFF || "🔫"),
    new ButtonBuilder()
      .setCustomId("btn_role_stumble")
      .setLabel("Stumble Guys")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(process.env.EMOJI_GAME_STUMBLE || "🏃"),
    new ButtonBuilder()
      .setCustomId("btn_role_fortnite")
      .setLabel("Fortnite")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(process.env.EMOJI_GAME_FORTNITE || "⛏️"),
  );

  // Envio com as 4 linhas
  await message.channel.send({
    embeds: [embed],
    components: [row1, row2, row3, row4],
  });

  if (message.deletable) await message.delete().catch(() => {});
};

module.exports = { handleGameRolesPanel };
