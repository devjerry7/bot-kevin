// handlers/notifyRoleHandler.js
const { EmbedBuilder } = require("discord.js");

module.exports = async (interaction) => {
  // Ignora se não for botão
  if (!interaction.isButton()) return false;

  const { customId } = interaction;

  // Lista dos botões que este painel gerencia
  const notifyButtons = [
    "btn_notify_giveaway",
    "btn_notify_interaction",
    "btn_notify_live",
  ];
  if (!notifyButtons.includes(customId)) return false;

  await interaction.deferReply({ ephemeral: true });

  // Mapeamento dos botões para os IDs dos cargos salvos na memória
  const roleMap = {
    btn_notify_giveaway: process.env.ROLE_NOTIFY_GIVEAWAY,
    btn_notify_interaction: process.env.ROLE_NOTIFY_INTERACTION,
    btn_notify_live: process.env.ROLE_NOTIFY_LIVE,
  };

  const roleId = roleMap[customId];
  const COLOR_BASE = process.env.COLOR_BASE
    ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
    : 0x962dc0;
  const COLOR_ERROR = 0xff0000;

  const createResponse = (desc, color = COLOR_BASE) => {
    return new EmbedBuilder()
      .setDescription(desc)
      .setColor(color)
      .setTimestamp();
  };

  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) {
    return interaction.editReply({
      embeds: [
        createResponse(
          "❌ Erro: O cargo de notificação não foi encontrado no servidor.",
          COLOR_ERROR,
        ),
      ],
    });
  }

  const hasRole = interaction.member.roles.cache.has(roleId);

  try {
    if (hasRole) {
      await interaction.member.roles.remove(roleId);
      await interaction.editReply({
        embeds: [
          createResponse(
            `🔕 Você removeu as notificações de **${role.name}**.`,
          ),
        ],
      });
    } else {
      await interaction.member.roles.add(roleId);
      await interaction.editReply({
        embeds: [
          createResponse(
            `🔔 Você agora receberá notificações de **${role.name}**!`,
          ),
        ],
      });
    }
  } catch (error) {
    console.error("[NOTIFY-ROLE ERROR]:", error);
    await interaction.editReply({
      embeds: [
        createResponse(
          "❌ **Erro de Permissão:** O cargo do bot (MC KEVIN) precisa estar no topo da hierarquia.",
          COLOR_ERROR,
        ),
      ],
    });
  }

  return true;
};
