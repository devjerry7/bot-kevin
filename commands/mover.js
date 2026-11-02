const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "mover",
  description: "Move todos os membros de um canal de voz para outro.",
  async execute(message, args) {
    const COLOR_BASE = process.env.COLOR_BASE
      ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
      : 0x962dc0;
    const COLOR_ERROR = 0xff0000;

    const createEmbed = (title, description, color = COLOR_BASE) => {
      return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
    };

    // ID do cargo autorizado (Staff/Manager) além de Administradores
    const STAFF_ROLE_ID = "1550589449082245161";

    const hasPermission =
      message.member.permissions.has(PermissionFlagsBits.MoveMembers) ||
      message.member.permissions.has(PermissionFlagsBits.Administrator) ||
      message.member.roles.cache.has(STAFF_ROLE_ID);

    if (!hasPermission) {
      return message.channel.send({
        embeds: [
          createEmbed(
            "<:br_errado2qn:1556905095919050762> Permissão Negada",
            "Você não tem permissão para mover membros de voz.",
            COLOR_ERROR,
          ),
        ],
      });
    }

    const sourceChannelId = args[0];
    const targetChannelId = args[1];

    if (!sourceChannelId || !targetChannelId) {
      return message.channel.send({
        embeds: [
          createEmbed(
            "<:ama_cuidado2qn:1545494059081142403> Uso Incorreto",
            "Siga o formato:\n`mc!mover <ID_canal_origem> <ID_canal_destino>`",
            COLOR_ERROR,
          ),
        ],
      });
    }

    const sourceChannel = message.guild.channels.cache.get(sourceChannelId);
    const targetChannel = message.guild.channels.cache.get(targetChannelId);

    if (!sourceChannel || !sourceChannel.isVoiceBased()) {
      return message.channel.send({
        embeds: [
          createEmbed(
            "<:br_errado2qn:1556905095919050762> Canal Inválido",
            "O canal de origem informado não existe ou não é um canal de voz.",
            COLOR_ERROR,
          ),
        ],
      });
    }

    if (!targetChannel || !targetChannel.isVoiceBased()) {
      return message.channel.send({
        embeds: [
          createEmbed(
            "<:br_errado2qn:1556905095919050762> Canal Inválido",
            "O canal de destino informado não existe ou não é um canal de voz.",
            COLOR_ERROR,
          ),
        ],
      });
    }

    // Filtra apenas membros reais (ignora bots) conectados no canal de origem
    const membersToMove = sourceChannel.members.filter((m) => !m.user.bot);

    if (membersToMove.size === 0) {
      return message.channel.send({
        embeds: [
          createEmbed(
            "<:ama_cuidado2qn:1545494059081142403> Canal Vazio",
            `Não há membros conectados em <#${sourceChannel.id}> para mover.`,
            COLOR_ERROR,
          ),
        ],
      });
    }

    let movedCount = 0;
    let failedCount = 0;

    // Move todos os membros em paralelo
    await Promise.all(
      membersToMove.map(async (member) => {
        try {
          await member.voice.setChannel(targetChannel);
          movedCount++;
        } catch (err) {
          failedCount++;
        }
      }),
    );

    return message.channel.send({
      embeds: [
        createEmbed(
          "<a:ver_verifcado2qn:1535775624864473169> Transferência de Call Concluída",
          `• **Origem:** <#${sourceChannel.id}>\n` +
            `• **Destino:** <#${targetChannel.id}>\n` +
            `• **Membros movidos:** \`${movedCount}\`\n` +
            (failedCount > 0 ? `• **Falhas:** \`${failedCount}\`` : ""),
        ),
      ],
    });
  },
};
