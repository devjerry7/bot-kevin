// handlers/matchHandler.js
const {
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const TournamentService = require("../services/tournamentService");

/**
 * Manipulador de interações focado em Sorteios, Partidas e Chaveamento
 */
module.exports = async function handleMatchInteractions(interaction) {
  try {
    const isSortearBtn =
      interaction.isButton() && interaction.customId === "btn_sortear_chaves";
    const isSortearCmd =
      interaction.isChatInputCommand &&
      interaction.isChatInputCommand() &&
      interaction.commandName === "sortear";

    if (!isSortearBtn && !isSortearCmd) {
      return false;
    }

    if (
      !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
    ) {
      return await interaction.reply({
        content: `<:serv:1545444524241719376> Você não possui permissão de Administrador para realizar o sorteio.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();

    const tournament = await TournamentService.getOrCreateActiveTournament(
      interaction.user.id,
    );

    const matches = await TournamentService.generateFirstRoundMatches(
      tournament.id,
    );

    let matchesText = "";
    matches.forEach((m, idx) => {
      const t1 = m.team1 ? m.team1.name : "N/A";
      const t2 = m.team2 ? m.team2.name : "BYE (Classificação Direta)";
      matchesText += `**Jogo #${idx + 1}:** \`${t1}\`  **VS**  \`${t2}\` \n`;
    });

    const embedSorteio = new EmbedBuilder()
      .setTitle("<a:2qn:1553155625738051604> SORTEIO DE CONFRONTOS - RODADA 1")
      .setColor(0xf1c40f)
      .setDescription(
        `O sorteio foi realizado com sucesso!\n\n` +
          `**Total de Jogos Gerados:** ${matches.length}\n\n` +
          `**Chaveamento:**\n${matchesText}`,
      )
      .setFooter({ text: "Campeonato 4x4 2QN • Fase 1" })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embedSorteio],
    });

    return true;
  } catch (err) {
    console.error("[ERRO MATCH INTERACTION]", err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: `<:serv:1545444524241719376> **Erro ao realizar sorteio:** ${err.message}`,
      });
    } else {
      await interaction.reply({
        content: `<:serv:1545444524241719376> **Erro ao realizar sorteio:** ${err.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
    return true;
  }
};
