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
    return message.reply(
      "❌ Apenas administradores podem postar o painel de jogos.",
    );
  }

  const COLOR_DIAMOND = 0x00e5ff;
  const HEADER_IMAGE =
    "https://media.discordapp.net/attachments/1539757756272091177/1540170399369662484/14_de_ago._de_2026_18_19_38.png?ex=6a88faf6&is=6a87a976&hm=9e613c70cf8982eb821bb1d6d0e9afb08f48de6a1932c2d51f7a8403effa30d8&=&format=webp&quality=lossless&width=1536&height=615";

  const embed = new EmbedBuilder()
    .setTitle("<:emoji_14:1540175395993690173> SELECIONE SEUS JOGOS")
    .setDescription(
      "Clique nos botões abaixo para adicionar ou remover as tags de jogo no seu perfil.\n\n" +
        "Isso liberará o acesso aos canais específicos de cada game e você poderá ser notificado para jogar com a galera!",
    )
    .setColor(COLOR_DIAMOND)
    .setImage(HEADER_IMAGE)
    .setFooter({
      text: "Sistema de Auto-Role",
      iconURL: message.guild.iconURL(),
    });

  // Linha 1: FPS / Tiro
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_role_ff")
      .setLabel("Free Fire")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:jogo_freefire:1537237851127816232>"),
    new ButtonBuilder()
      .setCustomId("btn_role_val")
      .setLabel("Valorant")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:valorant:1537237880089608252>"),
    new ButtonBuilder()
      .setCustomId("btn_role_cs")
      .setLabel("CS:GO/2")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:csemoji:1540150893322829904>"),
  );

  // Linha 2: Outros Jogos (Todos com emojis padrão)
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_role_gta")
      .setLabel("GTA V")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:gtaemoji:1540172171257581628>"),
    new ButtonBuilder()
      .setCustomId("btn_role_roblox")
      .setLabel("Roblox")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:jogo_roblox:1537237864847249568>"), // 👈 Trocado para emoji padrão de tijolo/bloco
    new ButtonBuilder()
      .setCustomId("btn_role_mine")
      .setLabel("Minecraft")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:mineicon:1540172781386342450>"),
  );

  // Linha 3: Novos Jogos Adicionados
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_role_codenames")
      .setLabel("Codenames")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:b_emoji:1537237908547965001>"),
    new ButtonBuilder()
      .setCustomId("btn_role_amongus")
      .setLabel("Among Us")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:amongemoji:1540174838596108298>"),
  );

  // Envio com as 3 linhas
  await message.channel.send({
    embeds: [embed],
    components: [row1, row2, row3],
  });

  if (message.deletable) await message.delete().catch(() => {});
};

module.exports = { handleGameRolesPanel };
