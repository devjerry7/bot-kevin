// commands/bolao.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");

module.exports = {
  name: "bolao",
  description: "Envia o painel interativo do bolão da partida de Valorant.",
  async execute(message, args) {
    // Trava de segurança para apenas administradores/staff dispararem
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply(
        "❌ Apenas administradores podem iniciar o painel do bolão.",
      );
    }

    const channelId = "1561188833180131378";
    const targetChannel =
      message.client.channels.cache.get(channelId) || message.channel;

    // Emojis configurados
    const emojiLoud = "<:ver_loud:1561188231033397439>";
    const emojiVit = "<:am_vit:1561190314671210618>";
    const emojiTrofeu = "<a:am_trofeu2qn:1556881758723776605>";

    const embed = new EmbedBuilder()
      .setTitle(`${emojiTrofeu} BOLÃO LOUD VALORANT - HOJE! ${emojiTrofeu}`)
      .setDescription(
        "Transmissão exclusiva no nosso servidor! Deixe seu palpite nos botões abaixo e venha torcer.\n\n" +
          "**Partida:** LOUD vs TEAM VITALITY (MD5)",
      )
      .setColor(0x962dc0)
      .setTimestamp();

    // LINHA 1: Vencedor
    const rowWinner = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("bolao_win_loud")
        .setLabel("LOUD")
        .setEmoji(emojiLoud)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("bolao_win_vitality")
        .setLabel("TEAM VITALITY")
        .setEmoji(emojiVit)
        .setStyle(ButtonStyle.Secondary),
    );

    // LINHA 2: Placar MD5 + Presença
    const rowScore = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("bolao_score_3x0")
        .setLabel("3x0")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("bolao_score_3x1")
        .setLabel("3x1")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("bolao_score_3x2")
        .setLabel("3x2")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("bolao_attend")
        .setLabel("<a:ver_verifcado2qn:1535775624864473169> Presença")
        .setStyle(ButtonStyle.Secondary),
    );

    // LINHA 3: MVP LOUD (darker, erde, luck xo, tkzin, davih)
    const rowMvpLoud = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("bolao_mvp_darker")
        .setLabel("darker")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("bolao_mvp_erde")
        .setLabel("erde")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("bolao_mvp_luck_xo")
        .setLabel("luck xo")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("bolao_mvp_tkzin")
        .setLabel("tkzin")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("bolao_mvp_davih")
        .setLabel("davih")
        .setStyle(ButtonStyle.Secondary),
    );

    // LINHA 4: MVP Vitality (Chronicle, Derke, PROFEK, Sayonara, Jamppi)
    const rowMvpVit = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("bolao_mvp_Chronicle")
        .setLabel("Chronicle")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("bolao_mvp_Derke")
        .setLabel("Derke")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("bolao_mvp_PROFEK")
        .setLabel("PROFEK")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("bolao_mvp_Sayonara")
        .setLabel("Sayonara")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("bolao_mvp_Jamppi")
        .setLabel("Jamppi")
        .setStyle(ButtonStyle.Secondary),
    );

    // Deleta o comando digitado no chat para limpar a tela
    if (message.deletable) await message.delete().catch(() => {});

    // Envia o painel interativo no canal configurado
    await targetChannel.send({
      embeds: [embed],
      components: [rowWinner, rowScore, rowMvpLoud, rowMvpVit],
    });
  },
};
