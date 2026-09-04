// commands/listMembers.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  handleListMembers: async (message, args) => {
    try {
      // --- Lendo variáveis estéticas e de configuração do .env ---
      const BANNER_URL = process.env.BANNER_URL;
      const COLOR_BASE = process.env.COLOR_BASE
        ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
        : 0x00e5ff;
      const PREFIX = process.env.PREFIX || "mc!";

      const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
      const EMOJI_SECURITY = process.env.EMOJI_SECURITY || "🔒";
      const EMOJI_LIST = process.env.EMOJI_LIST || "📋";

      // 1. Permissão: Administrador ou Gerenciar Cargos
      const hasPermission =
        message.member.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
        message.member.permissions.has(PermissionsBitField.Flags.Administrator);

      if (!hasPermission) {
        const reply = await message.reply(
          `${EMOJI_SECURITY} Apenas a equipe com permissão pode listar membros de cargos.`,
        );
        return setTimeout(() => reply.delete().catch(() => {}), 5000);
      }

      // 2. Identificar o Cargo (Menção ou ID)
      const roleIdentifier = args[0];
      if (!roleIdentifier) {
        const reply = await message.reply(
          `${EMOJI_ERROR} Uso correto: \`${PREFIX}membros @cargo\` ou \`${PREFIX}membros <ID_DO_CARGO>\``,
        );
        return setTimeout(() => reply.delete().catch(() => {}), 5000);
      }

      const roleId = roleIdentifier.replace(/<@&(\d+)>/, "$1");
      const role = message.guild.roles.cache.get(roleId);

      if (!role) {
        const reply = await message.reply(
          `${EMOJI_ERROR} Cargo não encontrado no servidor.`,
        );
        return setTimeout(() => reply.delete().catch(() => {}), 5000);
      }

      await message.channel.sendTyping();

      // 3. Garante que o cache de membros está atualizado
      await message.guild.members.fetch();

      const membersWithRole = role.members.map((m) => `• <@${m.user.id}>`);
      const total = membersWithRole.length;

      if (total === 0) {
        return message.reply(
          `O cargo **${role.name}** não possui nenhum membro vinculado.`,
        );
      }

      // 4. Formatar Lista (Limite de 40 nomes por segurança de tamanho do embed)
      const MAX_DISPLAY = 40;
      const displayList = membersWithRole.slice(0, MAX_DISPLAY).join("\n");
      const remaining = total - MAX_DISPLAY;

      let description = `**Cargo:** ${role}\n**Total:** ${total} membro(s)\n\n${displayList}`;

      if (remaining > 0) {
        description += `\n\n...e mais **${remaining}** membro(s).`;
      }

      const embedColor =
        role.hexColor !== "#000000" ? role.hexColor : COLOR_BASE;

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJI_LIST} Lista de Membros • ${role.name}`)
        .setDescription(description)
        .setColor(embedColor)
        .setImage(BANNER_URL)
        .setFooter({
          text: `Solicitado por ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[LISTMEMBERS ERROR]:", error);
      const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
      const errorMsg = await message.channel.send(
        `${EMOJI_ERROR} Ocorreu um erro ao carregar a lista de membros.`,
      );
      setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
    }
  },
};
