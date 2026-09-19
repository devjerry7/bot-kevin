// jobs/staffCron.js
const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const staffConfig = require("../config/staffConfig");
const config = require("../config");

module.exports = (client) => {
  const guild = client.guilds.cache.first();
  if (!guild) return;

  // ====================================================
  // A. SEGUNDA-FEIRA (00:00) - START DA SEMANA
  // ====================================================
  cron.schedule("0 0 * * 1", async () => {
    const avisosChannel = guild.channels.cache.get(
      staffConfig.channels.avisosStaff,
    );
    if (avisosChannel) {
      avisosChannel.send(
        `${config.emoji?.stats || "📢"} **Nova semana iniciada na Equipe!**\n\n` +
          `As metas semanais foram redefinidas. Foco total e acompanhem o progresso a qualquer momento digitando \`mc!meta\`. ` +
          `Bom trabalho a todos!`,
      );
    }
  });

  // ====================================================
  // B. QUINTA-FEIRA (18:00) - ALERTA DE MEIO DE SEMANA
  // ====================================================
  cron.schedule("0 18 * * 4", async () => {
    const staffList = await prisma.staffUser.findMany({
      where: { status: "ACTIVE" },
      include: { tracking: true },
    });

    for (const staff of staffList) {
      const tracking = staff.tracking || { msgCount: 0, voiceMinutes: 0 };
      const rankConfig =
        staffConfig.ranks[staff.currentRank] || staffConfig.ranks[1];
      const type = staff.trackType; // CHAT, CALL ou BOTH

      let percent = 0;
      if (type === "CHAT") {
        percent = (tracking.msgCount / (rankConfig.metaChat || 250)) * 100;
      } else if (type === "CALL") {
        percent = (tracking.voiceMinutes / (rankConfig.metaCall || 600)) * 100;
      } else {
        const pChat = (tracking.msgCount / (rankConfig.metaChat || 250)) * 100;
        const pCall =
          (tracking.voiceMinutes / (rankConfig.metaCall || 600)) * 100;
        percent = Math.min(pChat, pCall);
      }

      // Se estiver com menos de 50% da meta na quinta-feira
      if (percent < 50) {
        try {
          const user = await client.users.fetch(staff.discordId);
          await user.send(
            `${config.emoji?.warning || "⚠️"} **Aviso de Meio de Semana:** Notamos que você está com **${percent.toFixed(1)}%** da sua meta na trilha **${type}**.\n` +
              `O fechamento acontece domingo. Acelera o ritmo para manter seu histórico seguro!`,
          );
        } catch (e) {
          // DM fechada
        }
      }
    }
  });

  // ====================================================
  // C. DOMINGO (23:59) - CÁLCULO E FECHAMENTO (O CÉREBRO)
  // ====================================================
  cron.schedule("59 23 * * 0", async () => {
    const staffList = await prisma.staffUser.findMany({
      include: { tracking: true },
    });

    const logsChannel = guild.channels.cache.get(
      staffConfig.channels.logsStaff,
    );
    const chatStaffChannel = guild.channels.cache.get(
      staffConfig.channels.chatStaff,
    );

    for (const staff of staffList) {
      // Se estiver pausado, apenas zera o tracking e pula
      if (staff.status === "PAUSED") {
        await prisma.staffTracking.update({
          where: { discordId: staff.discordId },
          data: { msgCount: 0, voiceMinutes: 0 },
        });
        continue;
      }

      const tracking = staff.tracking || { msgCount: 0, voiceMinutes: 0 };
      const rankConfig =
        staffConfig.ranks[staff.currentRank] || staffConfig.ranks[1];
      const type = staff.trackType;

      let bateuMeta = false;
      let percent = 0;

      if (type === "CHAT") {
        const meta = rankConfig.metaChat || 250;
        percent = (tracking.msgCount / meta) * 100;
        bateuMeta = tracking.msgCount >= meta;
      } else if (type === "CALL") {
        const meta = rankConfig.metaCall || 600;
        percent = (tracking.voiceMinutes / meta) * 100;
        bateuMeta = tracking.voiceMinutes >= meta;
      } else {
        // BOTH (Precisa bater chat e call)
        const metaChat = rankConfig.metaChat || 250;
        const metaCall = rankConfig.metaCall || 600;
        const pChat = (tracking.msgCount / metaChat) * 100;
        const pCall = (tracking.voiceMinutes / metaCall) * 100;
        percent = Math.min(pChat, pCall);
        bateuMeta =
          tracking.msgCount >= metaChat && tracking.voiceMinutes >= metaCall;
      }

      const member = await guild.members
        .fetch(staff.discordId)
        .catch(() => null);

      // --- CENÁRIO 1: BATEU A META ---
      if (bateuMeta) {
        let newStreak = staff.streakWeeks + 1;
        let newRank = staff.currentRank;
        let promoted = false;

        // Verifica promoção se atingiu o requisito do rank atual
        if (
          newRank < 4 &&
          rankConfig.metaStreakRequired > 0 &&
          newStreak >= rankConfig.metaStreakRequired
        ) {
          newRank++;
          newStreak = 0; // Reseta streak para o próximo rank
          promoted = true;
        }

        // Atualiza banco (Bater a meta zera os warnings!)
        await prisma.staffUser.update({
          where: { discordId: staff.discordId },
          data: { streakWeeks: newStreak, currentRank: newRank, warnings: 0 },
        });

        // Mensagem de parabéns ao membro no privado
        if (member) {
          await member
            .send(
              `${config.emoji?.success || "✅"} **Parabéns pelo excelente trabalho!**\n` +
                `Você bateu sua meta semanal e garantiu mais uma semana de destaque.\n` +
                `🔥 Sequência atual: **${newStreak} semanas** consecutivas.`,
            )
            .catch(() => {});
        }

        // Se foi promovido, gerencia cargos no servidor
        if (promoted && member) {
          const oldRankInfo = staffConfig.ranks[staff.currentRank];
          const newRankInfo = staffConfig.ranks[newRank];

          const oldRoles = [
            type === "CHAT" || type === "BOTH" ? oldRankInfo.chatRole : null,
            type === "CALL" || type === "BOTH" ? oldRankInfo.callRole : null,
            oldRankInfo.permRole,
          ].filter(Boolean);

          const newRoles = [
            type === "CHAT" || type === "BOTH" ? newRankInfo.chatRole : null,
            type === "CALL" || type === "BOTH" ? newRankInfo.callRole : null,
            newRankInfo.permRole,
          ].filter(Boolean);

          await member.roles.remove(oldRoles).catch(() => {});
          await member.roles.add(newRoles).catch(() => {});

          if (chatStaffChannel) {
            chatStaffChannel.send(
              `${config.emoji?.success || "🎉"} **Promoção na Equipe!** <@${staff.discordId}> bateu todas as metas e foi promovido para **${newRankInfo.name}**! Parabéns pelo esforço! 🚀`,
            );
          }
        }
      }
      // --- CENÁRIO 2: NÃO BATEU A META ---
      else {
        let newWarnings = staff.warnings;
        let textLog = `${config.emoji?.warning || "⚠️"} <@${staff.discordId}> não atingiu a meta da semana (${percent.toFixed(1)}%).`;

        if (percent < 20) {
          newWarnings++;
          textLog = `${config.emoji?.error || "🚨"} **Alerta Crítico:** <@${staff.discordId}> atingiu menos de 20% da meta (${percent.toFixed(1)}%) e recebeu +1 advertência (Total: ${newWarnings}).`;
        }

        // Se tomar 2 warnings, desligamento automático
        if (newWarnings >= 2) {
          textLog = `${config.emoji?.error || "🔻"} **Desligamento:** <@${staff.discordId}> acumulou 2 advertências e foi removido automaticamente da equipe.`;

          if (member) {
            await member
              .send(
                `🔻 Informamos que devido ao não cumprimento das metas semanais estipuladas, você foi desligado da Equipe de Movimentação. Agradecemos pela dedicação prestada.`,
              )
              .catch(() => {});

            const allStaffRoles = [];
            for (const r in staffConfig.ranks) {
              allStaffRoles.push(
                staffConfig.ranks[r].chatRole,
                staffConfig.ranks[r].callRole,
                staffConfig.ranks[r].permRole,
              );
            }
            await member.roles
              .remove(allStaffRoles.filter(Boolean))
              .catch(() => {});
          }

          await prisma.staffTracking
            .delete({ where: { discordId: staff.discordId } })
            .catch(() => {});
          await prisma.staffUser
            .delete({ where: { discordId: staff.discordId } })
            .catch(() => {});
        } else {
          // Atualiza advertências e zera a sequência
          await prisma.staffUser.update({
            where: { discordId: staff.discordId },
            data: { streakWeeks: 0, warnings: newWarnings },
          });

          if (member) {
            await member
              .send(
                `${config.emoji?.warning || "⚠️"} **Aviso Semanal:** Notamos que você não bateu a meta desta semana. Contamos com sua dedicação redobrada no próximo ciclo!`,
              )
              .catch(() => {});
          }
        }

        if (logsChannel) logsChannel.send(textLog);
      }

      // Reset semanal dos contadores de tracking (para quem continua na equipe)
      if (staff.status === "ACTIVE" && staff.tracking) {
        await prisma.staffTracking.update({
          where: { discordId: staff.discordId },
          data: { msgCount: 0, voiceMinutes: 0, lastVoiceJoin: null },
        });
      }
    }
  });
};
