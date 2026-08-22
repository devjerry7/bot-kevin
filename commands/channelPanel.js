// commands/channelPanel.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");

// IDs dos Componentes (Botões, Modais e Menus)
const BTN = {
  CREATE: "btn_ch_create",
  EDIT: "btn_ch_edit",
  DELETE: "btn_ch_delete",
};
const MDL = { CREATE: "mdl_ch_create", RENAME: "mdl_ch_rename" };
const SEL = {
  DEL: "sel_ch_del",
  EDIT: "sel_ch_edit",
  TYPE: "sel_ch_type",
  CAT: "sel_ch_cat",
};

// ⚠️ ATENÇÃO: COLOQUE O LINK DO SEU BANNER NOVO AQUI ⚠️
const HEADER_IMAGE = "LINK_DO_SEU_BANNER_NOVO_AQUI";
const COLOR_DIAMOND = 0x00e5ff;

// --- MODELOS DE PERMISSÃO (PRESETS) ---
// Exportado para ser usado pelo Handler na hora de criar
const CHANNEL_PRESETS = {
  // --- CATEGORIAS ---
  cat_public: {
    label: "📂 Categoria Pública",
    description: "Organização: Todos veem os canais dentro.",
    type: ChannelType.GuildCategory,
    overwrites: (guild) => [
      {
        id: guild.roles.everyone.id,
        allow: [PermissionsBitField.Flags.ViewChannel],
      },
    ],
  },
  cat_staff: {
    label: "🔐 Categoria Staff",
    description: "Organização: Apenas Staff vê o conteúdo dentro.",
    type: ChannelType.GuildCategory,
    overwrites: (guild) => [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
    ],
  },
  // --- CANAIS DE TEXTO ---
  public_text: {
    label: "💬 Chat Público",
    description: "Texto: Aberto para todos.",
    type: ChannelType.GuildText,
    overwrites: (guild) => [
      {
        id: guild.roles.everyone.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
        ],
      },
    ],
  },
  announcement: {
    label: "📢 Avisos (Leitura)",
    description: "Texto: Apenas leitura.",
    type: ChannelType.GuildText,
    overwrites: (guild) => [
      {
        id: guild.roles.everyone.id,
        allow: [PermissionsBitField.Flags.ViewChannel],
        deny: [PermissionsBitField.Flags.SendMessages],
      },
    ],
  },
  staff_text: {
    label: "🕵️ Chat Staff (Privado)",
    description: "Texto: Invisível para membros.",
    type: ChannelType.GuildText,
    overwrites: (guild) => [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
    ],
  },
  // --- CANAIS DE VOZ ---
  public_voice: {
    label: "🔊 Voz Pública",
    description: "Voz: Aberto para todos.",
    type: ChannelType.GuildVoice,
    overwrites: (guild) => [
      {
        id: guild.roles.everyone.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.Connect,
        ],
      },
    ],
  },
  staff_voice: {
    label: "🔒 Voz Staff (Privado)",
    description: "Voz: Apenas Staff conecta.",
    type: ChannelType.GuildVoice,
    overwrites: (guild) => [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
    ],
  },
};

// V2: Verificação de segurança direta (Apenas Admins) sem depender do .env
function canManageChannels(member) {
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.id === member.guild.ownerId
  );
}

module.exports = {
  BTN,
  MDL,
  SEL,
  CHANNEL_PRESETS,

  handleChannelPanel: async (message) => {
    if (!canManageChannels(message.member)) {
      const msg = await message.reply(
        "🔒 Apenas Administradores podem postar o painel de canais.",
      );
      return setTimeout(() => msg.delete().catch(() => {}), 5000);
    }

    const embed = new EmbedBuilder()
      .setTitle("🏗️ Infraestrutura de Canais")
      .setDescription(
        "Gerencie a estrutura do servidor (Categorias, Texto e Voz) utilizando modelos seguros.\n" +
          "Você não precisa configurar permissões manualmente, o bot faz isso por você.",
      )
      .setColor(COLOR_DIAMOND)
      .setImage(HEADER_IMAGE)
      .setThumbnail(message.guild.iconURL());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN.CREATE)
        .setLabel("Criar")
        .setStyle(ButtonStyle.Success)
        .setEmoji("➕"),
      new ButtonBuilder()
        .setCustomId(BTN.EDIT)
        .setLabel("Renomear")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("✏️"),
      new ButtonBuilder()
        .setCustomId(BTN.DELETE)
        .setLabel("Deletar")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️"),
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    if (message.deletable) message.delete().catch(() => {});
  },
};
