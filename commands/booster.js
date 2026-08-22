// commands/booster.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// Já atualizei o caminho supondo que o boosterManager vai para a pasta services!
const { ensureBooster } = require("../services/boosterManager");

// IDs dos Botões
const BTN_TAG = "boost_tag";
const BTN_CHANNEL = "boost_channel";
const BTN_ADD = "boost_add";

// Config Visual
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443770029354127451/banner-vip-booster.png?ex=692a471e&is=6928f59e&hm=2dc7967ad2cde87a2a4bc015e97d7abbc75362ab40f798fb7949c6d32fdf7dda";
const COLOR_PINK = 0xf47fff; // Mantive o Rosa Nitro porque combina perfeitamente com os Boosters!

const handleBoosterPanel = async (message) => {
  try {
    const member = message.member;

    // --- 1. Bloqueia quem não é Booster ---
    if (!member.premiumSince) {
      const blockEmbed = new EmbedBuilder()
        .setTitle("🚀 Área Restrita")
        .setDescription(
          "Este painel é exclusivo para **Server Boosters**.\nImpulsione o servidor para desbloquear seus benefícios!",
        )
        .setColor(0x2f3136);

      const msg = await message.channel.send({ embeds: [blockEmbed] });
      return setTimeout(() => msg.delete().catch(() => {}), 5000);
    }

    // --- 2. Busca ou cadastra o booster no Banco de Dados ---
    const data = await ensureBooster(member.id);

    if (!data) {
      const errorMsg = await message.channel.send(
        "❌ Erro ao buscar seus dados de Booster.",
      );
      return setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
    }

    // --- 3. Monta a Embed ---
    const embed = new EmbedBuilder()
      .setTitle(`🚀 Painel Booster VIP`)
      .setDescription(
        `Obrigado pelo impulso, **${member.user.username}**! Configure seus benefícios exclusivos abaixo.`,
      )
      .setColor(COLOR_PINK)
      .setImage(HEADER_IMAGE)
      .addFields(
        {
          name: "🏷️ Tag Personalizada",
          value: data.customRoleId ? `<@&${data.customRoleId}>` : "Nenhuma",
          inline: true,
        },
        {
          name: "🔊 Call Exclusiva",
          value: data.customChannelId
            ? `<#${data.customChannelId}>`
            : "Nenhuma",
          inline: true,
        },
        {
          name: "👥 Convidados",
          value: `${data.friends?.length || 0}`,
          inline: true,
        },
      )
      .setFooter({
        text: "Benefícios Nitro Booster",
        iconURL: message.guild.iconURL(),
      })
      .setTimestamp();

    // --- 4. Monta os Botões ---
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN_TAG)
        .setLabel("Criar/Editar Tag")
        .setEmoji("🏷️")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(BTN_CHANNEL)
        .setLabel("Criar Call VIP")
        .setEmoji("🔊")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(BTN_ADD)
        .setLabel("Add Amigo na Call")
        .setEmoji("👥")
        .setStyle(ButtonStyle.Secondary),
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error("[BOOSTER CMD ERROR]:", error);
    const errorMsg = await message.channel.send(
      "❌ Ocorreu um erro interno ao abrir o painel booster.",
    );
    setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
  }
};

module.exports = {
  BTN_TAG,
  BTN_CHANNEL,
  BTN_ADD,
  handleBoosterPanel,
};
