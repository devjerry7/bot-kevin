const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../../config");

module.exports = {
  name: "ffsetup",
  description:
    "Envia o painel de inscrição para o campeonato 2x2 de Free Fire.",
  async execute(message, args) {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.channel.send(
        `${config.emoji.error} Você precisa ser Administrador para usar este comando.`,
      );
    }

    await prisma.ffTournament.upsert({
      where: { id: "main" },
      update: { isOpen: true },
      create: { id: "main", isOpen: true },
    });

    const embed = new EmbedBuilder()
      .setTitle("<:emoji_4:1542026409067937824> 2x2 2qn")
      .setURL("https://www.tiktok.com/@__2qn_")
      .setDescription(
        `• **Horário:** 22:00\n` +
          `• **Formato:** 2x2\n` +
          `• **Premiação:** PIX ou VIP\n\n` +
          `**Requisitos:**\n` +
          `• Estar em call\n` +
          `• Usando a tag do servidor\n` +
          `• Seguir o perfil no [TikTok](https://www.tiktok.com/@__2qn_)\n\n` +
          `• Telagem responsável: <@1544694287986458628> e <@1490416746128080976>\n` +
          `Clique no botão abaixo para garantir sua inscrição!`,
      )
      .setColor(config.colorBase || 0x962dc0)
      .setFooter({ text: "2qn" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ff_register_btn")
        .setLabel("Inscrever-se")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(config.emoji.success || "✅"),
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    return message.delete().catch(() => {});
  },
};
