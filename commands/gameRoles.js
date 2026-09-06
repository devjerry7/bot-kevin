// commands/gameRoles.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  PermissionsBitField,
} = require("discord.js");

// Função para extrair apenas o ID do emoji do .env e evitar erros na renderização
const parseEmoji = (emojiString, fallback = "🎮") => {
  if (!emojiString) return fallback;
  const match = emojiString.match(/:(\d+)>$/);
  return match ? match[1] : emojiString;
};

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
    .setTitle(`${EMOJI_PANEL_GAMES}  GAMES`)
    .setDescription(
      "**Mostre quais jogos você curte!**\n\n" +
        "<:pontinho:1545828067035848814> Selecione seus jogos favoritos para receber notificações quando a galera estiver jogando.",
    )
    .setColor(COLOR_BASE)
    .setImage(BANNER_URL)
    .setFooter({
      text: "2qn",
      iconURL: message.guild.iconURL(),
    });

  // --- Criando o Menu Suspenso Múltiplo ---
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("select_game_roles")
    .setPlaceholder("Selecione os jogos que você joga...")
    .setMinValues(0) // 0 permite que o cara desmarque tudo se quiser
    .setMaxValues(16) // Permite selecionar vários de uma vez só!
    .addOptions([
      new StringSelectMenuOptionBuilder()
        .setLabel("Free Fire")
        .setValue("role_ff")
        .setEmoji(parseEmoji(process.env.EMOJI_GAME_FF, "🔥")),
      new StringSelectMenuOptionBuilder()
        .setLabel("Valorant")
        .setValue("role_val")
        .setEmoji(parseEmoji(process.env.EMOJI_GAME_VAL, "🎯")),
      new StringSelectMenuOptionBuilder()
        .setLabel("CS:GO/2")
        .setValue("role_cs")
        .setEmoji(parseEmoji(process.env.EMOJI_GAME_CS, "🔫")),
      new StringSelectMenuOptionBuilder()
        .setLabel("GTA V")
        .setValue("role_gta")
        .setEmoji(parseEmoji(process.env.EMOJI_GAME_GTA, "🚗")),
      new StringSelectMenuOptionBuilder()
        .setLabel("Roblox")
        .setValue("role_roblox")
        .setEmoji(parseEmoji(process.env.EMOJI_GAME_ROBLOX, "🧱")),
      new StringSelectMenuOptionBuilder()
        .setLabel("Minecraft")
        .setValue("role_mine")
        .setEmoji(parseEmoji(process.env.EMOJI_GAME_MINE, "⛏️")),
      new StringSelectMenuOptionBuilder()
        .setLabel("Codenames")
        .setValue("role_codenames")
        .setEmoji(parseEmoji(process.env.EMOJI_GAME_CODENAMES, "🕵️")),
      new StringSelectMenuOptionBuilder()
        .setLabel("Among Us")
        .setValue("role_amongus")
        .setEmoji(parseEmoji(process.env.EMOJI_GAME_AMONGUS, "🔪")),
      new StringSelectMenuOptionBuilder()
        .setLabel("League of Legends")
        .setValue("role_lol")
        .setEmoji(parseEmoji(process.env.EMOJI_GAME_LOL, "🪄")),
      new StringSelectMenuOptionBuilder()
        .setLabel("Plato")
        .setValue("role_plato")
        .setEmoji(parseEmoji(process.env.EMOJI_GAME_PLATO, "📱")),
      new StringSelectMenuOptionBuilder()
        .setLabel("Gartic")
        .setValue("role_gartic")
        .setEmoji(parseEmoji(process.env.EMOJI_GAME_GARTIC, "🎨")),
      new StringSelectMenuOptionBuilder()
        .setLabel("Bloodstrike")
        .setValue("role_bloodstrike")
        .setEmoji(parseEmoji(process.env.EMOJI_GAME_BLOODSTRIKE, "🩸")),
      new StringSelectMenuOptionBuilder()
        .setLabel("Clash Royale")
        .setValue("role_clash")
        .setEmoji(parseEmoji(process.env.EMOJI_GAME_CLASH, "👑")),
      new StringSelectMenuOptionBuilder()
        .setLabel("Standoff 2")
        .setValue("role_standoff")
        .setEmoji(parseEmoji(process.env.EMOJI_GAME_STANDOFF, "🔫")),
      new StringSelectMenuOptionBuilder()
        .setLabel("Stumble Guys")
        .setValue("role_stumble")
        .setEmoji(parseEmoji(process.env.EMOJI_GAME_STUMBLE, "🏃")),
      new StringSelectMenuOptionBuilder()
        .setLabel("Fortnite")
        .setValue("role_fortnite")
        .setEmoji(parseEmoji(process.env.EMOJI_GAME_FORTNITE, "⛏️")),
    ]);

  // Colocando o menu na ActionRow
  const row = new ActionRowBuilder().addComponents(selectMenu);

  // Envio da mensagem limpa e compacta
  await message.channel.send({
    embeds: [embed],
    components: [row],
  });

  if (message.deletable) await message.delete().catch(() => {});
};

module.exports = { handleGameRolesPanel };
