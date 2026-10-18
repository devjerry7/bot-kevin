// commands/bolao.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
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
    const targetChannel = message.channel;

    // ====================================================
    // SUBCOMANDO: mc!bolao fechar / travar / lock
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
            "<:ama_cuidado2qn:1545494059081142403> Não foi possível encontrar a mensagem ativa do bolão neste canal.",
          );
        }

        const disabledComponents = bolaoMessage.components.map((row) => {
          const newRow = new ActionRowBuilder();
          row.components.forEach((comp) => {
            if (comp.type === 3) {
              // Select Menu
              const newSelect =
                StringSelectMenuBuilder.from(comp).setDisabled(true);
              newRow.addComponents(newSelect);
            } else {
              // Button
              const newBtn = ButtonBuilder.from(comp).setDisabled(true);
              newRow.addComponents(newBtn);
            }
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
          "<a:ver_verifcado2qn:1535775624864473169> **Bolão fechado com sucesso!** Os menus e botões foram desativados.",
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
      const winnerInput = args[1];
      const scoreInput = args[2];
      const mvpInput = args[3];

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
    // PAINEL PADRÃO: mc!bolao (Menu de Seleção + Botão de Presença)
    // ====================================================
    const emojiTrofeu = "<a:am_trofeu2qn:1556881758723776605>";

    const embed = new EmbedBuilder()
      .setTitle(`${emojiTrofeu} BOLÃO LOUD VALORANT - HOJE! ${emojiTrofeu}`)
      .setDescription(
        "Transmissão exclusiva no nosso servidor! Selecione seus palpites nos menus abaixo e venha torcer.\n\n" +
          "**Partida:** LOUD vs TEAM VITALITY (MD5)",
      )
      .setImage(BANNER_URL)
      .setColor(0x962dc0)
      .setTimestamp();

    // MENU 1: Vencedor e Placar
    const menuWinnerScore = new StringSelectMenuBuilder()
      .setCustomId("bolao_select_winnerscore")
      .setPlaceholder(
        "<a:am_trofeu2qn:1556881758723776605> Selecione o Vencedor e o Placar Exato...",
      )
      .addOptions([
        {
          label: "LOUD 3x0",
          value: "loud_3x0",
          description: "Vitória limpa da LOUD",
        },
        {
          label: "LOUD 3x1",
          value: "loud_3x1",
          description: "LOUD vence por 3x1",
        },
        {
          label: "LOUD 3x2",
          value: "loud_3x2",
          description: "LOUD vence no sufoco por 3x2",
        },
        {
          label: "Vitality 3x0",
          value: "vitality_3x0",
          description: "Vitória limpa da Vitality",
        },
        {
          label: "Vitality 3x1",
          value: "vitality_3x1",
          description: "Vitality vence por 3x1",
        },
        {
          label: "Vitality 3x2",
          value: "vitality_3x2",
          description: "Vitality vence no sufoco por 3x2",
        },
      ]);

    // MENU 2: Escolha do MVP
    const menuMvp = new StringSelectMenuBuilder()
      .setCustomId("bolao_select_mvp")
      .setPlaceholder("🔥 Selecione o MVP da Partida...")
      .addOptions([
        {
          label: "darker (LOUD)",
          value: "darker",
          description: "Jogador da LOUD",
        },
        { label: "erde (LOUD)", value: "erde", description: "Jogador da LOUD" },
        {
          label: "luck xo (LOUD)",
          value: "luck_xo",
          description: "Jogador da LOUD",
        },
        {
          label: "tkzin (LOUD)",
          value: "tkzin",
          description: "Jogador da LOUD",
        },
        {
          label: "davih (LOUD)",
          value: "davih",
          description: "Jogador da LOUD",
        },
        {
          label: "Chronicle (Vitality)",
          value: "Chronicle",
          description: "Jogador da Vitality",
        },
        {
          label: "Derke (Vitality)",
          value: "Derke",
          description: "Jogador da Vitality",
        },
        {
          label: "PROFEK (Vitality)",
          value: "PROFEK",
          description: "Jogador da Vitality",
        },
        {
          label: "Sayonara (Vitality)",
          value: "Sayonara",
          description: "Jogador da Vitality",
        },
        {
          label: "Jamppi (Vitality)",
          value: "Jamppi",
          description: "Jogador da Vitality",
        },
      ]);

    // BOTÃO: Confirmar Presença
    const btnAttendance = new ButtonBuilder()
      .setCustomId("bolao_attend")
      .setLabel("Confirmar Presença na Live")
      .setEmoji("<a:ver_verifcado2qn:1535775624864473169>")
      .setStyle(ButtonStyle.Success);

    const row1 = new ActionRowBuilder().addComponents(menuWinnerScore);
    const row2 = new ActionRowBuilder().addComponents(menuMvp);
    const row3 = new ActionRowBuilder().addComponents(btnAttendance);

    try {
      if (message.deletable) await message.delete().catch(() => {});

      await targetChannel.send({
        embeds: [embed],
        components: [row1, row2, row3],
      });
    } catch (err) {
      console.error("[BOLAO SEND ERROR]:", err);
      return message.channel.send(
        `<:br_errado2qn:1556905095919050762> Erro ao enviar o painel do bolão: ${err.message}`,
      );
    }
  },
};
