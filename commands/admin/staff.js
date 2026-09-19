// commands/admin/staff.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../../config");
const staffConfigData = require("../../config/staffConfig");

module.exports = {
  name: "staff",
  description: "Gerencia a equipe de movimentação (Chat, Call ou Ambos).",
  async execute(message, args) {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply(`${config.emoji?.error || "❌"} Apenas administradores podem usar este comando.`);
      }

      const action = args[0]?.toLowerCase();

      if (!["add", "remove", "painel", "perdoar", "testarcron"].includes(action)) {
        return message.reply(
          `🛠️ **Gerenciamento da Equipe:**\n` +
            `\`mc!staff add @usuario chat/call/ambos\` - Adiciona um membro.\n` +
            `\`mc!staff remove @usuario\` - Remove da equipe.\n` +
            `\`mc!staff painel\` - Mostra o progresso geral e metas do rank atual.\n` +
            `\`mc!staff perdoar @usuario\` - Completa a meta da semana atual.\n` +
            `\`mc!staff testarcron\` - Simula o fechamento semanal para testes.`
        );
      }

      if (action === "painel") {
        const staffList = await prisma.staffUser.findMany({
          include: { tracking: true },
        });
        if (staffList.length === 0) {
          return message.reply(`${config.emoji?.warning || "⚠️"} Nenhum membro na equipe no momento.`);
        }

        const description = staffList
          .map((s) => {
            const tr = s.tracking || { msgCount: 0, voiceMinutes: 0 };
            const type = s.trackType;

            const rankConfig = staffConfigData.ranks[s.currentRank] || staffConfigData.ranks[1];
            const rankName = rankConfig.name || `Rank ${s.currentRank}`;

            let progressoTxt = "";
            let percent = 0;

            if (type === "CHAT") {
              const meta = rankConfig.metaChat || 250;
              progressoTxt = `💬 ${tr.msgCount}/${meta} msgs`;
              percent = Math.min(100, Math.floor((tr.msgCount / meta) * 100));
            } else if (type === "CALL") {
              const meta = rankConfig.metaCall || 600;
              const atualHoras = (tr.voiceMinutes / 60).toFixed(1);
              const metaHoras = (meta / 60).toFixed(1);
              progressoTxt = `🎙️ ${atualHoras}h/${metaHoras}h`;
              percent = Math.min(100, Math.floor((tr.voiceMinutes / meta) * 100));
            } else {
              const metaC = rankConfig.metaChat || 250;
              const metaV = rankConfig.metaCall || 600;
              const atualHoras = (tr.voiceMinutes / 60).toFixed(1);
              const pChat = Math.min(100, Math.floor((tr.msgCount / metaC) * 100));
              const pCall = Math.min(100, Math.floor((tr.voiceMinutes / metaV) * 100));
              progressoTxt = `💬 ${tr.msgCount}/${metaC} \vert{} 🎙️ ${atualHoras}h`;
              percent = Math.min(pChat, pCall);
            }

            const statusIcon = s.status === "PAUSED" ? "⏸️" : percent >= 100 ? (config.emoji?.success || "✅") : (config.emoji?.loading || "⏳");

            return `${statusIcon} <@${s.discordId}> | **${rankName}** (${type})\n└ Progresso: \`${progressoTxt}\` (${percent}\%) \vert{} 🔥 ${s.streakWeeks} sem`;
          })
          .join("\n\n");

        const embed = new EmbedBuilder()
          .setTitle(`${config.emoji?.stats || "📊"} Painel Geral da Equipe`)
          .setDescription(description)
          .setColor(config.colorBase || 0x00ffcc)
          .setTimestamp();

        return message.reply({ embeds: [embed] });
      }

      if (action === "testarcron") {
        const staffList = await prisma.staffUser.findMany({ include: { tracking: true } });
        if (staffList.length === 0) {
          return message.reply(`${config.emoji?.warning || "⚠️"} Nenhum membro na equipe para testar.`);
        }

        let relatorio = "📊 **Relatório de Simulação de Fechamento:**\n\n";

        for (const staff of staffList) {
          const tr = staff.tracking || { msgCount: 0, voiceMinutes: 0 };
          const rankConfig = staffConfigData.ranks[staff.currentRank] || staffConfigData.ranks[1];
          const type = staff.trackType;

          let bateuMeta = false;
          if (type === "CHAT") bateuMeta = tr.msgCount >= (rankConfig.metaChat || 250);
          else if (type === "CALL") bateuMeta = tr.voiceMinutes >= (rankConfig.metaCall || 600);
          else bateuMeta = tr.msgCount >= (rankConfig.metaChat || 250) && tr.voiceMinutes >= (rankConfig.metaCall || 600);

          if (bateuMeta) {
            const novaStreak = staff.streakWeeks + 1;
            relatorio += `${config.emoji?.success || "✅"} <@${staff.discordId}> (${rankConfig.name} - ${type}) - **Meta Batida!** (Streak:${novaStreak})\n`;
          } else {
            relatorio += `${config.emoji?.warning \vert{}\vert{} "⚠️"} <@${staff.discordId}> (${rankConfig.name} -${type}) - **Meta Não Batida** (Warning aplicado)\n`;
          }
        }

        await prisma.staffTracking.updateMany({ data: { msgCount: 0, voiceMinutes: 0 } });

        const embed = new EmbedBuilder()
          .setTitle(`${config.emoji?.stats || "📊"} Simulação de Virada de Semana`)
          .setDescription(relatorio + `\n🔄 *Contadores zerados para o próximo ciclo de teste.*`)
          .setColor(config.colorBase || 0x00ffcc)
          .setTimestamp();

        return message.reply({ embeds: [embed] });
      }

      const targetUser = message.mentions.users.first() || message.guild.members.cache.get(args[1])?.user;
      if (!targetUser) {
        return message.reply(`${config.emoji?.error || "❌"} Você precisa mencionar um membro válido! Ex: \`mc!staff add @usuario chat\``);
      }

      if (action === "add") {
        let rawType = args[2]?.toUpperCase();

        if (rawType === "AMBOS" || rawType === "BOTH" || rawType === "TODOS") {
          rawType = "BOTH";
        }

        if (!["CHAT", "CALL", "BOTH"].includes(rawType)) {
          return message.reply(`${config.emoji?.error || "❌"} Especifique a trilha corretamente: \`chat\`, \`call\` ou \`ambos\`. Ex: \`mc!staff add @user chat\``);
        }

        await prisma.staffUser.upsert({
          where: { discordId: targetUser.id },
          update: { trackType: rawType, status: "ACTIVE", currentRank: 1 },
          create: {
            discordId: targetUser.id,
            trackType: rawType,
            currentRank: 1,
          },
        });

        await prisma.staffTracking.upsert({
          where: { discordId: targetUser.id },
          update: {},
          create: { discordId: targetUser.id },
        });

        const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
        if (member) {
          const rank1Info = staffConfigData.ranks[1];
          const rolesToAdd = [];

          if (rawType === "CHAT" || rawType === "BOTH") {
            if (rank1Info.chatRole) rolesToAdd.push(rank1Info.chatRole);
          }
          if (rawType === "CALL" || rawType === "BOTH") {
            if (rank1Info.callRole) rolesToAdd.push(rank1Info.callRole);
          }

          if (rolesToAdd.length > 0) {
            await member.roles.add(rolesToAdd).catch((err) => {
              console.error("[ERRO CARGO DISCORD]", err);
              message.channel.send(`${config.emoji?.warning || "⚠️"} Membro salvo no banco, mas **falhou ao aplicar o cargo**.`);
            });
          }
        }

        await targetUser
          .send(
            `${config.emoji?.success || "✅"} Olá, **${targetUser.username}**! Você foi escalado para a equipe de movimentação (**${rawType}**).\n\n` +
              `Suas metas semanais já estão ativas. Acompanhe seu progresso digitando \`mc!meta\` no servidor.`
          )
          .catch(() => {});

        return message.reply(`${config.emoji?.success || "✅"} O usuário <@${targetUser.id}> foi adicionado com sucesso na trilha **${rawType}** (Trainee)!`);
      }

      if (action === "remove") {
        const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
        if (member) {
          const allRolesToRemove = [];
          for (const r in staffConfigData.ranks) {
            allRolesToRemove.push(
              staffConfigData.ranks[r].chatRole,
              staffConfigData.ranks[r].callRole,
              staffConfigData.ranks[r].permRole
            );
          }
          await member.roles.remove(allRolesToRemove.filter(Boolean)).catch(() => {});
        }

        await prisma.staffTracking.deleteMany({ where: { discordId: targetUser.id } }).catch(() => {});
        await prisma.staffUser.deleteMany({ where: { discordId: targetUser.id } }).catch(() => {});

        return message.reply(`${config.emoji?.success || "✅"} O usuário <@${targetUser.id}> foi removido da equipe, teve os cargos retirados e o histórico limpo.`);
      }

      if (action === "perdoar") {
        const staff = await prisma.staffUser.findUnique({
          where: { discordId: targetUser.id },
        });
        if (!staff) {
          return message.reply(`${config.emoji?.error || "❌"} Este usuário não faz parte da equipe.`);
        }

        const rankConfig = staffConfigData.ranks[staff.currentRank] || staffConfigData.ranks[1];

        const updateData = {};
        if (staff.trackType === "CHAT" || staff.trackType === "BOTH") {
          updateData.msgCount = rankConfig.metaChat || 250;
        }
        if (staff.trackType === "CALL" || staff.trackType === "BOTH") {
          updateData.voiceMinutes = rankConfig.metaCall || 600;
        }

        await prisma.staffTracking.update({
          where: { discordId: targetUser.id },
          data: updateData,
        });

        return message.reply(`${config.emoji?.success || "✅"} O progresso do usuário <@${targetUser.id}> foi concluído em 100% para esta semana.`);
      }
    } catch (err) {
      console.error("[ERRO CRÍTICO COMANDO /STAFF]", err);
      return message.reply(`${config.emoji?.error || "❌"} Ocorreu um erro interno ao executar este comando.`);
    }
  },
};