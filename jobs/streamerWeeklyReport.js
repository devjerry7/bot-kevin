// jobs/streamerWeeklyReport.js
const cron = require("node-cron");
const { EmbedBuilder } = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const streamerConfig = require("../config/streamerConfig");

// IDs dos donos/diretoria que receberão o relatório no PV
const OWNER_IDS = ["1551147533454282806", "697947696702554223"];

function startStreamerWeeklyReport(client) {
  console.log(
    "[SISTEMA DE STREAMERS] Job de relatório semanal inicializado (Executa todo domingo às 23:59)...",
  );

  // Agendado para todo domingo às 23:59
  cron.schedule("59 23 * * 0", async () => {
    try {
      // Busca todos os streamers cadastrados no banco
      const streamers = await prisma.streamer.findMany({
        where: { enabled: true },
      });

      if (streamers.length === 0) return;

      const goalHours = streamerConfig.goals.weeklyVoiceHours;
      const goalInvites = streamerConfig.goals.weeklyInvites;

      let reportDescription =
        "<:br_registro2qn:1557798191100072119> **Fechamento Semanal de Streamers**\n\n";

      for (const s of streamers) {
        const hoursInCall = Number((s.weeklyVoiceMinutes / 60).toFixed(1));
        const invites = s.weeklyInvites || 0;

        const metVoice = hoursInCall >= goalHours;
        const metInvites = invites >= goalInvites;

        const statusIcon =
          metVoice && metInvites
            ? "<:br_correto2qn:1556905093729882217> **Meta Cumprida**"
            : "<:br_errado2qn:1556905095919050762> **Meta Incompleta**";

        const streamerTag = s.discordUserId
          ? `<@${s.discordUserId}>`
          : s.displayName || "Streamer";
        const displayName = s.displayName || "Sem Nome";

        reportDescription +=
          `<:pr_pessoinha2qn:1542026405481684994> **${streamerTag}** (${displayName})\n` +
          `• Call: \`${hoursInCall}h\` / \`${goalHours}h\` ${metVoice ? "<:br_correto2qn:1556905093729882217>" : "<:br_errado2qn:1556905095919050762>"}\n` +
          `• Convites: \`${invites}\` / \`${goalInvites}\` ${metInvites ? "<:br_correto2qn:1556905093729882217>" : "<:br_errado2qn:1556905095919050762>"}\n` +
          `• Resultado: ${statusIcon}\n\n`;
      }

      const COLOR_BASE = process.env.COLOR_BASE
        ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
        : 0x962dc0;

      const embed = new EmbedBuilder()
        .setTitle(
          "<a:am_trofelzinho:1556881756521766934>  Relatório Semanal de Desempenho dos Streamers",
        )
        .setDescription(reportDescription)
        .setColor(COLOR_BASE)
        .setTimestamp();

      // Envia a mensagem privada (PV) para cada um dos IDs configurados
      for (const ownerId of OWNER_IDS) {
        try {
          const user = await client.users.fetch(ownerId);
          if (user) {
            await user.send({ embeds: [embed] });
          }
        } catch (err) {
          console.error(
            `[StreamerReport] Falha ao enviar PV para o ID ${ownerId}:`,
            err.message,
          );
        }
      }

      // Reseta os contadores semanais no banco de dados para o novo ciclo
      await prisma.streamer.updateMany({
        data: {
          weeklyVoiceMinutes: 0,
          weeklyInvites: 0,
        },
      });

      console.log(
        "[StreamerReport] Relatório enviado no PV dos donos e contadores resetados com sucesso.",
      );
    } catch (error) {
      console.error(
        "[StreamerReport] Erro ao gerar relatório semanal no PV:",
        error,
      );
    }
  });
}

module.exports = { startStreamerWeeklyReport };
