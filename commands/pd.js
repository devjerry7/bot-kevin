// commands/pd.js
const { EmbedBuilder } = require("discord.js");
const {
  getPdData,
  addPd,
  removePd,
  MAX_PDS_PER_STAFF,
} = require("../pdManager");

/**
 * Função principal que gerencia os comandos PD, setpd, e removepd.
 */
module.exports = {
  handlePDCommand: async (message, command, args) => {
    const pdData = getPdData();
    const client = message.client;

    // --- Lendo variáveis de configuração do .env ---
    const PREFIX = process.env.PREFIX || "mc!";
    const PD_ROLE_ID = process.env.PD_ROLE_ID;
    const PD_PERMITTED_ROLES = process.env.PD_PERMITTED_ROLES
      ? process.env.PD_PERMITTED_ROLES.split(",")
      : [];

    // --- Lendo variáveis estéticas do .env ---
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_SUCCESS = process.env.EMOJI_SUCCESS || "✅";
    const EMOJI_CROWN = process.env.EMOJI_CROWN || "👑";
    const EMOJI_PRINCESS = process.env.EMOJI_PRINCESS || "👸";
    const EMOJI_PARTY = process.env.EMOJI_PARTY || "🎉";
    const EMOJI_BROKEN_HEART = process.env.EMOJI_BROKEN_HEART || "💔";
    const COLOR_PD = process.env.COLOR_PD
      ? parseInt(process.env.COLOR_PD.replace("#", ""), 16)
      : 0xffa500;

    // --- Comando: pd (Visualizar PDs Atuais) ---
    if (command === "pd") {
      if (pdData.pds.length === 0) {
        return message.channel.send(
          "Atualmente, não há nenhuma Primeira Dama definida.",
        );
      }

      const pdEmbed = new EmbedBuilder()
        .setTitle(`${EMOJI_CROWN} Primeiras Damas Atuais do Servidor`)
        .setColor(COLOR_PD);

      // Usa Promise.all para buscar membros de forma assíncrona e segura
      const pdPromises = pdData.pds.map(async (pd, index) => {
        const pdMember = await message.guild.members
          .fetch(pd.memberId)
          .catch(() => null);
        const staffUser = await client.users
          .fetch(pd.staffId)
          .catch(() => null);

        const staffTag = staffUser ? staffUser.tag : "Staff Desconhecido";
        const sinceDate = new Date(pd.since).toLocaleDateString("pt-BR");

        if (pdMember) {
          const pdName = pdMember.displayName;

          pdEmbed.addFields({
            name: `${EMOJI_PRINCESS} #${index + 1}: ${pdName}`,
            value: `**Definida por:** ${staffTag}\n**Desde:** ${sinceDate}`,
            inline: true,
          });

          if (index === 0) {
            pdEmbed.setThumbnail(
              pdMember.user.displayAvatarURL({ dynamic: true, size: 256 }),
            );
          }
        } else {
          pdEmbed.addFields({
            name: `${EMOJI_ERROR} PD Antiga (Membro saiu)`,
            value: `ID: ${pd.memberId} (Indicada por: ${staffTag})`,
            inline: true,
          });
        }
      });

      // Espera todas as buscas (fetch) terminarem antes de enviar
      await Promise.all(pdPromises);

      await message.channel.send({ embeds: [pdEmbed] });
      if (message.deletable) await message.delete().catch(console.error);
      return;
    }

    // --- Comando: setpd (@membro) ---
    if (command === "setpd") {
      // Checa se o Staff tem a permissão com base na lista do .env
      const isPermitted = message.member.roles.cache.some((role) =>
        PD_PERMITTED_ROLES.includes(role.id),
      );

      if (!isPermitted) {
        return message.reply(
          `${EMOJI_ERROR} Você não tem permissão para definir a Primeira Dama.`,
        );
      }

      const newPdMember = message.mentions.members.first();
      if (!newPdMember) {
        return message.reply(
          `${EMOJI_ERROR} Uso correto: \`${PREFIX}setpd @membro\`.`,
        );
      }

      const pdRole = message.guild.roles.cache.get(PD_ROLE_ID);

      if (!pdRole) {
        console.error("Erro: Cargo PD_ROLE_ID não encontrado no servidor.");
        return message.reply(
          `${EMOJI_ERROR} Erro interno: O cargo de Primeira Dama não está configurado corretamente.`,
        );
      }

      // Tenta adicionar a PD ao sistema
      const { success, message: managerMessage } = addPd(
        newPdMember.id,
        message.author.id,
      );

      if (!success) {
        return message.reply(`${EMOJI_ERROR} ${managerMessage}`);
      }

      try {
        // DÁ O CARGO À NOVA PD
        await newPdMember.roles.add(pdRole);

        // Notifica o canal
        await message.channel.send(
          `${EMOJI_PARTY} A Staff **${message.author.tag}** indicou <@${newPdMember.id}> como uma **Primeira Dama**! Ela recebeu o cargo ${pdRole.toString()}.`,
        );

        // Notifica o Staff
        const remaining =
          MAX_PDS_PER_STAFF - (getPdData().staffCount[message.author.id] || 0);
        return message.reply(
          `${EMOJI_SUCCESS} Você definiu ${newPdMember.user.tag} como PD. Você ainda pode indicar mais ${remaining} PDs.`,
        );
      } catch (error) {
        console.error("Erro ao adicionar cargo de PD:", error);
        // Se falhar, reverte a contagem no manager para evitar problemas de limite.
        removePd(newPdMember.id);
        return message.reply(
          `${EMOJI_ERROR} Erro ao dar o cargo. Verifique as permissões do bot.`,
        );
      }
    }

    // --- Comando: removepd (@membro) ---
    if (command === "removepd") {
      const isPermitted = message.member.roles.cache.some((role) =>
        PD_PERMITTED_ROLES.includes(role.id),
      );

      if (!isPermitted) {
        return message.reply(
          `${EMOJI_ERROR} Você não tem permissão para remover a Primeira Dama.`,
        );
      }

      const targetMember = message.mentions.members.first();
      if (!targetMember) {
        return message.reply(
          `${EMOJI_ERROR} Uso correto: \`${PREFIX}removepd @membro\`.`,
        );
      }

      const pdRole = message.guild.roles.cache.get(PD_ROLE_ID);

      if (!targetMember.roles.cache.has(PD_ROLE_ID)) {
        return message.reply(
          `${EMOJI_ERROR} O membro ${targetMember.user.tag} não possui o cargo de Primeira Dama.`,
        );
      }

      const { success, pdToRemove } = removePd(targetMember.id);

      if (!success) {
        return message.reply(
          `${EMOJI_ERROR} Este membro não está listado como uma Primeira Dama no banco de dados.`,
        );
      }

      try {
        // REMOVE O CARGO
        if (pdRole) await targetMember.roles.remove(pdRole);

        // Notifica o Staff
        const staffTag = pdToRemove.staffId
          ? (await client.users.fetch(pdToRemove.staffId).catch(() => null))
              ?.tag
          : "Staff Desconhecido";

        const logMessage = pdToRemove
          ? `(Indicada por: ${staffTag}, desde: ${new Date(pdToRemove.since).toLocaleDateString("pt-BR")})`
          : "";

        await message.reply(
          `${EMOJI_SUCCESS} ${targetMember.user.tag} foi removido(a) como Primeira Dama. ${logMessage}`,
        );

        // Notifica o canal
        await message.channel.send(
          `${EMOJI_BROKEN_HEART} A Staff **${message.author.tag}** removeu o status de Primeira Dama de <@${targetMember.id}>.`,
        );
      } catch (error) {
        console.error("Erro ao remover cargo de PD:", error);
        return message.reply(
          `${EMOJI_ERROR} Erro ao remover o cargo. Verifique as permissões do bot.`,
        );
      }
    }
  },
};
