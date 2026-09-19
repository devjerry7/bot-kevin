// commands/admin/staffAdmin.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../../config");

module.exports = {
  name: "staffadmin",
  description: "Gerenciamento avançado de metas e advertências da equipe.",
  async execute(message, args) {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply(
        `${config.emoji?.error || "❌"} Apenas administradores podem usar este comando.`,
      );
    }

    const subAction = args[0]?.toLowerCase();

    if (!["meta", "warn"].includes(subAction)) {
      return message.reply(
        `🛠️ **Uso correto:**\n` +
          `\`mc!staffadmin meta chat <número>\` - Altera a meta semanal de chat.\n` +
          `\`mc!staffadmin meta call <minutos>\` - Altera a meta semanal de call.\n` +
          `\`mc!staffadmin warn @usuario\` - Adiciona uma advertência.`,
      );
    }

    // ALTERAR METAS GLOBAIS
    if (subAction === "meta") {
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
          `${config.emoji?.error || "❌"} Especifique se é \`chat\` ou \`call\`.`,
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

    // ADICIONAR ADVERTÊNCIA
    if (subAction === "warn") {
      const targetUser = message.mentions.users.first();
      if (!targetUser)
        return message.reply(
          `${config.emoji?.error || "❌"} Mencione o membro que receberá a advertência.`,
        );

      const staff = await prisma.staffUser.findUnique({
        where: { discordId: targetUser.id },
      });
      if (!staff)
        return message.reply(
          `${config.emoji?.error || "❌"} Este usuário não faz parte da equipe.`,
        );

      const updated = await prisma.staffUser.update({
        where: { discordId: targetUser.id },
        data: { warnings: { increment: 1 } },
      });

      return message.reply(
        `${config.emoji?.success || "✅"} Advertência registrada para <@${targetUser.id}>. Total atual: **${updated.warnings}** advertência(s).`,
      );
    }
  },
};
