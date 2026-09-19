// jobs/staffCron.js
const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const staffConfig = require("../config/staffConfig");

module.exports = (client) => {
  // Pega o primeiro servidor do bot (como é um bot focado em 1 servidor, isso funciona perfeitamente)
  const guild = client.guilds.cache.first();
  if (!guild) return;

  // ====================================================
  // A. SEGUNDA-FEIRA (00:00) - START DA SEMANA
  // ====================================================
  cron.schedule("0 0 * * 1", async () => {
    const configDB = (await prisma.staffConfig.findUnique({
      where: { id: "main" },
    })) || { metaChatSemanal: 250, metaCallMinutos: 600 };

    const avisosChannel = guild.channels.cache.get(
      staffConfig.channels.avisosStaff,
    );
    if (avisosChannel) {
      avisosChannel.send(
        `📢 **Atenção Staff!** Nova semana iniciada.\n` +
          `🎯 **Metas da semana:**\n` +
          `💬 Mov Chat: **${configDB.metaChatSemanal} mensagens**\n` +
          `🎙️ Mov Call: **${(configDB.metaCallMinutos / 60).toFixed(1)} horas**\n\n` +
          `Bom trabalho a todos! Lembrem-se de usar \`mc!meta\` para acompanhar o progresso.`,
      );
    }
  });

  // ====================================================
  // B. QUINTA-FEIRA (18:00) - ALERTA DE MEIO DE SEMANA
  // ====================================================
  cron.schedule("0 18 * * 4", async () => {
    const configDB = (await prisma.staffConfig.findUnique({
      where: { id: "main" },
    })) || { metaChatSemanal: 250, metaCallMinutos: 600 };
    const staffList = await prisma.staffUser.findMany({
      where: { status: "ACTIVE" },
      include: { tracking: true },
    });

    for (const staff of staffList) {
      const tracking = staff.tracking || { msgCount: 0, voiceMinutes: 0 };
      const isChat = staff.trackType === "CHAT";
      const meta = isChat ? configDB.metaChatSemanal : configDB.metaCallMinutos;
      const atual = isChat ? tracking.msgCount : tracking.voiceMinutes;
      const percent = (atual / meta) * 100;

      // Se estiver com menos de 50% da meta
      if (percent < 50) {
        try {
          const user = await client.users.fetch(staff.discordId);
          await user.send(
            `⚠️ **Fala soldado!** Faltam 3 dias pro fechamento da semana e você está com apenas **${percent.toFixed(1)}%** da sua meta de ${staff.trackType}.\n` +
              `Acelera aí pra não perder o seu streak na staff!`,
          );
        } catch (e) {
          // Usuário com DM fechada
        }
      }
    }
  });

  // ====================================================
  // C. DOMINGO (23:59) - CÁLCULO E FECHAMENTO (O CÉREBRO)
  // ====================================================
  cron.schedule("59 23 * * 0", async () => {
    const configDB = (await prisma.staffConfig.findUnique({
      where: { id: "main" },
    })) || { metaChatSemanal: 250, metaCallMinutos: 600 };
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
      // Se o usuário estiver PAUSADO, apenas zeramos o tracking dele sem dar punição ou streak.
      if (staff.status === "PAUSED") {
        await prisma.staffTracking.update({
          where: { discordId: staff.discordId },
          data: { msgCount: 0, voiceMinutes: 0 },
        });
        continue;
      }

      const tracking = staff.tracking || { msgCount: 0, voiceMinutes: 0 };
      const isChat = staff.trackType === "CHAT";
      const meta = isChat ? configDB.metaChatSemanal : configDB.metaCallMinutos;
      const atual = isChat ? tracking.msgCount : tracking.voiceMinutes;
      const percent = (atual / meta) * 100;

      const member = await guild.members
        .fetch(staff.discordId)
        .catch(() => null);

      // --- CENÁRIO 1: BATEU A META ---
      if (percent >= 100) {
        let newStreak = staff.streakWeeks + 1;
        let newRank = staff.currentRank;

        const rankInfo = staffConfig.ranks[staff.currentRank];

        // Verifica se alcançou o streak para promoção (E se não está no rank máximo 4)
        let promoted = false;
        if (
          newRank < 4 &&
          rankInfo.metaStreakRequired > 0 &&
          newStreak >= rankInfo.metaStreakRequired
        ) {
          newRank++;
          newStreak = 0; // Reseta o streak para começar a contar para o próximo rank
          promoted = true;
        }

        // Atualiza banco
        await prisma.staffUser.update({
          where: { discordId: staff.discordId },
          data: { streakWeeks: newStreak, currentRank: newRank, warnings: 0 }, // Bater a meta zera os warnings!
        });

        // Se foi promovido, gerencia cargos e manda anúncio
        if (promoted && member) {
          const oldRankInfo = staffConfig.ranks[staff.currentRank];
          const newRankInfo = staffConfig.ranks[newRank];

          // Tira os cargos velhos (Visual e Permissão)
          const oldRoles = [
            isChat ? oldRankInfo.chatRole : oldRankInfo.callRole,
            oldRankInfo.permRole,
          ].filter(Boolean);
          await member.roles.remove(oldRoles).catch(() => {});

          // Dá os cargos novos (Visual e Permissão)
          const newRoles = [
            isChat ? newRankInfo.chatRole : newRankInfo.callRole,
            newRankInfo.permRole,
          ].filter(Boolean);
          await member.roles.add(newRoles).catch(() => {});

          if (chatStaffChannel) {
            chatStaffChannel.send(
              `🎉 **PARABÉNS!** <@${staff.discordId}> bateu a meta com maestria e foi promovido para **${newRankInfo.name} (${staff.trackType})**! Voa garoto! 🚀`,
            );
          }
        }
      }

      // --- CENÁRIO 2: NÃO BATEU A META ---
      else {
        let newWarnings = staff.warnings;
        let textLog = `⚠️ <@${staff.discordId}> não bateu a meta (${percent.toFixed(1)}%).`;

        // Falha crítica (Menos de 20% da meta)
        if (percent < 20) {
          newWarnings++;
          textLog = `🚨 **FALHA CRÍTICA!** <@${staff.discordId}> fez menos de 20% da meta (${percent.toFixed(1)}%) e recebeu +1 Warning (Total: ${newWarnings}).`;
        }

        // Se tomar 2 warnings, DEMISSÃO
        if (newWarnings >= 2) {
          textLog = `🔻 **DEMISSÃO:** <@${staff.discordId}> acumulou 2 warnings e foi removido automaticamente da staff.`;

          // Tenta mandar DM
          if (member) {
            await member
              .send(
                "🔻 Olá. Devido à inatividade prolongada e não cumprimento das metas estipuladas, você foi removido da Staff de Movimentação. Agradecemos o tempo que esteve com a gente.",
              )
              .catch(() => {});

            // Remove TODOS os cargos de staff que o cara possa ter
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

          // Deleta do Banco
          await prisma.staffTracking
            .delete({ where: { discordId: staff.discordId } })
            .catch(() => {});
          await prisma.staffUser
            .delete({ where: { discordId: staff.discordId } })
            .catch(() => {});
        } else {
          // Apenas atualiza o banco (Reseta streak e aplica warning se houver)
          await prisma.staffUser.update({
            where: { discordId: staff.discordId },
            data: { streakWeeks: 0, warnings: newWarnings },
          });
        }

        if (logsChannel) logsChannel.send(textLog);
      }

      // RESET do Tracking para todos (que não foram demitidos)
      if (newWarnings < 2) {
        await prisma.staffTracking.update({
          where: { discordId: staff.discordId },
          data: { msgCount: 0, voiceMinutes: 0, lastVoiceJoin: null },
        });
      }
    }
  });
};
