// commands/bolao.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const MATCH_NAME = "LOUD vs Vitality";
const BANNER_URL =
  "https://cdn.discordapp.com/attachments/1556759191597748276/1561196312953884763/Grande_Final__LOUD_vs_Team_Vitality.png?ex=6ad578de&is=6ad4275e&hm=291308017e0d77ddc6fa5900aaff7f350d468f0191c59a3980c6e15364bc209d&";

module.exports = {
  name: "bolao",
  description: "Gerencia o painel e apuração do bolão de Valorant.",
  async execute(message, args) {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.channel.send(
        "<:br_errado2qn:1556905095919050762> Apenas administradores podem gerenciar o bolão.",
      );
    }

    const subCommand = args[0] ? args[0].toLowerCase() : "";
    const channelId = "1561188833180131378";
    const targetChannel =
      message.client.channels.cache.get(channelId) || message.channel;

    // ====================================================
    // SUBCOMANDO: mc!bolao fechar / travar / lock
    // Desativa todos os botões no canal de transmissão
    // ====================================================
    if (
      subCommand === "fechar" ||
      subCommand === "travar" ||
      subCommand === "lock"
    ) {
      try {
        const messages = await targetChannel.messages.fetch({ limit: 20 });
        const bolaoMessage = messages.find(
          (m) => m.author.id === message.client.user.id && m.embeds.length > 0,
        );

        if (!bolaoMessage) {
          return message.channel.send(
            "<:ama_cuidado2qn:1545494059081142403> Não foi possível encontrar a mensagem ativa do bolão no canal.",
          );
        }

        const disabledComponents = bolaoMessage.components.map((row) => {
          const newRow = new ActionRowBuilder();
          row.components.forEach((btn) => {
            const newBtn = ButtonBuilder.from(btn).setDisabled(true);
            newRow.addComponents(newBtn);
          });
          return newRow;
        });

        const oldEmbed = bolaoMessage.embeds[0];
        const updatedEmbed = EmbedBuilder.from(oldEmbed).setDescription(
          oldEmbed.description +
            "\n\n🔒 **BOLÃO ENCERRADO!** Apostas travadas para o início da partida.",
        );

        await bolaoMessage.edit({
          embeds: [updatedEmbed],
          components: disabledComponents,
        });

        if (message.deletable) await message.delete().catch(() => {});
        return message.channel.send(
          "<a:ver_verifcado2qn:1535775624864473169> **Bolão fechado com sucesso!** Os botões foram desativados.",
        );
      } catch (err) {
        console.error("[BOLAO FECHAR ERROR]:", err);
        return message.channel.send(
          "<:br_errado2qn:1556905095919050762> Erro ao fechar o bolão.",
        );
      }
    }

    // ====================================================
    // SUBCOMANDO: mc!bolao resultado <Vencedor> <Placar> <MVP>
    // Exemplo: mc!bolao resultado LOUD 3x1 darker
    // ====================================================
    if (subCommand === "resultado" || subCommand === "apurar") {
      const winnerInput = args[1]; // LOUD ou Vitality
      const scoreInput = args[2]; // Ex: 3x1
      const mvpInput = args[3]; // Ex: darker

      if (!winnerInput || !scoreInput || !mvpInput) {
        return message.channel.send(
          "<:br_errado2qn:1556905095919050762> Uso correto do resultado:\n`mc!bolao resultado <LOUD|Vitality> <3x0|3x1|3x2> <NomeDoMVP>`\nExemplo: `mc!bolao resultado LOUD 3x1 darker`",
        );
      }

      try {
        const winnerName = winnerInput.toLowerCase().includes("loud")
          ? "LOUD"
          : "Team Vitality";

        const votes = await prisma.bolaoVote.findMany({
          where: { matchName: MATCH_NAME },
        });

        if (votes.length === 0) {
          return message.channel.send(
            "<:ama_cuidado2qn:1545494059081142403> Nenhum voto registrado para este bolão.",
          );
        }

        // Filtra os acertos
        const winnersAccurate = votes.filter(
          (v) =>
            v.votedWinner?.toLowerCase() === winnerName.toLowerCase() &&
            v.votedScore === scoreInput &&
            v.votedMvp?.toLowerCase() === mvpInput.toLowerCase(),
        );

        const winnersPartial = votes.filter(
          (v) =>
            v.votedWinner?.toLowerCase() === winnerName.toLowerCase() &&
            !winnersAccurate.some((a) => a.id === v.id),
        );

        const totalAttendees = votes.filter((v) => v.attending).length;

        const formatMentions = (list) =>
          list.length > 0
            ? list.map((v) => `<@${v.discordUserId}>`).join(", ")
            : "Ninguém";

        const resultEmbed = new EmbedBuilder()
          .setTitle(
            "<a:am_trofeu2qn:1556881758723776605> RESULTADO OFICIAL DO BOLÃO!",
          )
          .setDescription(
            `**Partida:** LOUD vs TEAM VITALITY (MD5)\n` +
              `<a:am_trofeu2qn:1556881758723776605> **Vencedor Real:** \`${winnerName}\`\n` +
              `<:br_incricao2qn:1556905090835546173> **Placar Final:** \`${scoreInput}\`\n` +
              `<:ama_coroa2qn:1535775618615087154> **MVP:** \`${mvpInput}\`\n\n` +
              `<a:ver_verifcado2qn:1535775624864473169> **Presenças Confirmadas na Live:** \`${totalAttendees}\` membros\n\n` +
              `<:br_registro2qn:1557798191100072119> **ACERTARAM TUDO (Gabarito Exato):**\n${formatMentions(winnersAccurate)}\n\n` +
              `<a:ver_verifcado2qn:1535775624864473169> **Acertaram apenas o Vencedor:**\n${formatMentions(winnersPartial)}`,
          )
          .setImage(BANNER_URL)
          .setColor(0x962dc0)
          .setTimestamp();

        if (message.deletable) await message.delete().catch(() => {});
        return message.channel.send({ embeds: [resultEmbed] });
      } catch (err) {
        console.error("[BOLAO RESULT ERROR]:", err);
        return message.channel.send(
          "<:br_errado2qn:1556905095919050762> Erro ao apurar o resultado do bolão.",
        );
      }
    }

    // ====================================================
    // PAINEL PADRÃO: mc!bolao (Envia os botões no canal de transmissão)
    // ====================================================
    const emojiLoud = "<:ver_loud:1561188231033397439>";
    const emojiVit = "<:am_vit:1561190314671210618>";
    const emojiTrofeu = "<a:am_trofeu2qn:1556881758723776605>";

    const embed = new EmbedBuilder()
      .setTitle(`${emojiTrofeu} BOLÃO LOUD VALORANT - HOJE! ${emojiTrofeu}`)
      .setDescription(
        "Transmissão exclusiva no nosso servidor! Deixe seu palpite nos botões abaixo e venha torcer.\n\n" +
          "**Partida:** LOUD vs TEAM VITALITY (MD5)",
      )
      .setImage(BANNER_URL)
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

    // LINHA 3: MVP LOUD
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

    // LINHA 4: MVP Vitality
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

    if (message.deletable) await message.delete().catch(() => {});

    await targetChannel.send({
      embeds: [embed],
      components: [rowWinner, rowScore, rowMvpLoud, rowMvpVit],
    });
  },
};
