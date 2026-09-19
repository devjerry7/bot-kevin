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
      // 1. Verificação de Segurança: Apenas Administradores
      if (
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return message.reply(
          `${config.emoji?.error || "❌"} Apenas administradores podem usar este comando.`,
        );
      }

      const action = args[0]?.toLowerCase();

      // Comando sem argumentos ou ação inválida mostra o mini-help
      if (!["add", "remove", "painel", "perdoar", "meta"].includes(action)) {
        return message.reply(
          `🛠️ **Uso correto do comando:**\n` +
            `\`mc!staff add @usuario chat/call/ambos\` - Adiciona um membro.\n` +
            `\`mc!staff remove @usuario\` - Remove da staff.\n` +
            `\`mc!staff painel\` - Mostra o progresso de todos.\n` +
            `\`mc!staff meta chat/call <valor>\` - Altera as metas globais.\n` +
            `\`mc!staff perdoar @usuario\` - Completa a meta do membro na semana atual.`,
        );
      }

      // ALTERAR METAS GLOBAIS (ex: mc!staff meta chat 2)
      if (action === "meta") {
        const tipoMeta = args[1]?.toLowerCase();
        const valor = parseInt(args[2]);

        if (isNaN(valor) || valor <= 0) {
          return message.reply(
            `${config.emoji?.error || "❌"} Informe um valor numérico válido.`,
          );
        }

        let updateData = {};
        if (tipoMeta === "chat") updateData.metaChatSemanal = valor;
        else if (tipoMeta === "call") updateData.metaCallMinutos = valor;
        else
          return message.reply(
            `${config.emoji?.error || "❌"} Especifique se é \`chat\` ou \`call\`. Ex: \`mc!staff meta chat 50\``,
          );

        await prisma.staffConfig.upsert({
          where: { id: "main" },
          update: updateData,
          create: { id: "main", ...updateData },
        });

        return message.reply(
          `${config.emoji?.success || "✅"} Meta global de **${tipoMeta}** atualizada para **${valor}** com sucesso!`,
        );
      }

      // PAINEL GERAL (Não precisa de menção de usuário)
      if (action === "painel") {
        const staffList = await prisma.staffUser.findMany({
          include: { tracking: true },
        });
        if (staffList.length === 0)
          return message.reply(
            `${config.emoji?.warning || "⚠️"} Nenhum membro na equipe atualmente.`,
          );

        const staffConfig = (await prisma.staffConfig.findUnique({
          where: { id: "main" },
        })) || { metaChatSemanal: 250, metaCallMinutos: 600 };

        const description = staffList
          .map((s) => {
            const tr = s.tracking || { msgCount: 0, voiceMinutes: 0 };
            const type = s.trackType; // CHAT, CALL ou BOTH

            let progressoTxt = "";
            let percent = 0;

            if (type === "CHAT") {
              const meta = staffConfig.metaChatSemanal;
              progressoTxt = `💬 ${tr.msgCount}/${meta} msgs`;
              percent = Math.min(100, Math.floor((tr.msgCount / meta) * 100));
            } else if (type === "CALL") {
              const meta = staffConfig.metaCallMinutos;
              progressoTxt = `🎙️ ${(tr.voiceMinutes / 60).toFixed(1)}h/${(meta / 60).toFixed(1)}h`;
              percent = Math.min(
                100,
                Math.floor((tr.voiceMinutes / meta) * 100),
              );
            } else {
              // BOTH (Precisa bater as duas)
              const pChat = Math.min(
                100,
                Math.floor((tr.msgCount / staffConfig.metaChatSemanal) * 100),
              );
              const pCall = Math.min(
                100,
                Math.floor(
                  (tr.voiceMinutes / staffConfig.metaCallMinutos) * 100,
                ),
              );
              progressoTxt = `💬 ${tr.msgCount}/${staffConfig.metaChatSemanal} \vert{} 🎙️ ${(tr.voiceMinutes / 60).toFixed(1)}h`;
              percent = Math.min(pChat, pCall);
            }

            const statusIcon =
              s.status === "PAUSED"
                ? "⏸️"
                : percent >= 100
                  ? config.emoji?.success || "✅"
                  : config.emoji?.loading || "⏳";

            return `${statusIcon} <@${s.discordId}> \vert{} (${type})\n└ Progresso: \`${progressoTxt}\` (${percent}\%) \vert{} 🔥 ${s.streakWeeks} sem`;
          })
          .join("\n\n");

        const embed = new EmbedBuilder()
          .setTitle(`${config.emoji?.stats || "📊"} Painel Geral da Equipe`)
          .setDescription(description)
          .setColor(config.colorBase || 0x00ffcc)
          .setTimestamp();

        return message.reply({ embeds: [embed] });
      }

      // Identifica o usuário mencionado com segurança total
      const targetUser =
        message.mentions.users.first() ||
        message.guild.members.cache.get(args[1])?.user;
      if (!targetUser) {
        return message.reply(
          `${config.emoji?.error || "❌"} Você precisa mencionar um usuário válido! Ex: \`mc!staff add @usuario chat\``,
        );
      }

      // ADICIONAR
      if (action === "add") {
        let rawType = args[2]?.toUpperCase();

        // Traduz variações comuns
        if (rawType === "AMBOS" || rawType === "BOTH" || rawType === "TODOS")
          rawType = "BOTH";

        if (!["CHAT", "CALL", "BOTH"].includes(rawType)) {
          return message.reply(
            `${config.emoji?.error || "❌"} Especifique a trilha corretamente: \`chat\`, \`call\` ou \`ambos\`. Ex: \`mc!staff add @user chat\``,
          );
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

        // Aplica o cargo automaticamente no Discord
        const member = await message.guild.members
          .fetch(targetUser.id)
          .catch(() => null);
        if (member) {
          const rank1Info = staffConfigData.ranks[1];
          const rolesToAdd = [];

          if (rawType === "CHAT" || rawType === "BOTH")
            if (rank1Info.chatRole) rolesToAdd.push(rank1Info.chatRole);
          if (rawType === "CALL" || rawType === "BOTH")
            if (rank1Info.callRole) rolesToAdd.push(rank1Info.callRole);

          if (rolesToAdd.length > 0) {
            await member.roles.add(rolesToAdd).catch((err) => {
              console.error("[ERRO CARGO DISCORD]", err);
              message.channel.send(
                `${config.emoji?.warning || "⚠️"} Membro salvo no banco, mas **falhou ao aplicar o cargo**. Verifique a hierarquia de cargos no painel do servidor.`,
              );
            });
          }
        }

        // Tenta mandar DM de boas-vindas amigável
        await targetUser
          .send(
            `${config.emoji?.success || "✅"} Olá, **${targetUser.username}**! Você foi escalado para a equipe de movimentação (**${rawType}**).\n\n` +
              `Suas metas semanais já estão ativas. Acompanhe seu progresso digitando \`mc!meta\` no servidor.\n\n` +
              `Bom trabalho e foco nos objetivos!`,
          )
          .catch(() => {});

        return message.reply(
          `${config.emoji?.success || "✅"} O usuário <@${targetUser.id}> foi adicionado com sucesso na trilha **${rawType}** e os cargos foram aplicados!`,
        );
      }

      // REMOVER
      if (action === "remove") {
        const member = await message.guild.members
          .fetch(targetUser.id)
          .catch(() => null);
        if (member) {
          const allRolesToRemove = [];
          for (const r in staffConfigData.ranks) {
            allRolesToRemove.push(
              staffConfigData.ranks[r].chatRole,
              staffConfigData.ranks[r].callRole,
              staffConfigData.ranks[r].permRole,
            );
          }
          await member.roles
            .remove(allRolesToRemove.filter(Boolean))
            .catch(() => {});
        }

        await prisma.staffTracking
          .deleteMany({ where: { discordId: targetUser.id } })
          .catch(() => {});
        await prisma.staffUser
          .deleteMany({ where: { discordId: targetUser.id } })
          .catch(() => {});

        return message.reply(
          `${config.emoji?.success || "✅"} O usuário <@${targetUser.id}> foi removido da equipe, teve os cargos retirados e o histórico limpo.`,
        );
      }

      // PERDOAR
      if (action === "perdoar") {
        const staff = await prisma.staffUser.findUnique({
          where: { discordId: targetUser.id },
        });
        if (!staff)
          return message.reply(
            `${config.emoji?.error || "❌"} Este usuário não faz parte da equipe.`,
          );

        const staffConfig = (await prisma.staffConfig.findUnique({
          where: { id: "main" },
        })) || { metaChatSemanal: 250, metaCallMinutos: 600 };

        const updateData = {};
        if (staff.trackType === "CHAT" || staff.trackType === "BOTH")
          updateData.msgCount = staffConfig.metaChatSemanal;
        if (staff.trackType === "CALL" || staff.trackType === "BOTH")
          updateData.voiceMinutes = staffConfig.metaCallMinutos;

        await prisma.staffTracking.update({
          where: { discordId: targetUser.id },
          data: updateData,
        });

        return message.reply(
          `${config.emoji?.success || "✅"} O progresso do usuário <@${targetUser.id}> foi concluído em 100% para esta semana.`,
        );
      }
    } catch (err) {
      console.error("[ERRO CRÍTICO COMANDO /STAFF]", err);
      return message.reply(
        `${config.emoji?.error || "❌"} Ocorreu um erro interno ao executar este comando.`,
      );
    }
  },
};
