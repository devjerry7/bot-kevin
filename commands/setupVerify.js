// commands/setupVerify.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  MessageFlags,
} = require("discord.js");
const { getGuildConfig } = require("../utils/guildConfigManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-verificacao")
    .setDescription("🔘 Posta o painel de verificação no canal configurado."),

  async execute(interaction) {
    // 1. Segurança
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return interaction.reply({
        content: "⛔ Sem permissão.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // 2. Busca Configuração do Banco
    const config = await getGuildConfig(interaction.guild.id);
    const channelId = config.verificationChannelId;

    if (!channelId) {
      return interaction.editReply(
        "⚠️ O canal de verificação não está configurado! Use **/config** > **Verificação** primeiro."
      );
    }

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
      return interaction.editReply(
        "⚠️ Canal configurado não encontrado (talvez foi deletado?). Configure novamente."
      );
    }

    // 3. Monta o Painel
    const HEADER_IMAGE =
      "https://i.pinimg.com/736x/4d/68/8e/4d688edfeedd4bec17b856d2a2ad7241.jpg";

    const embed = new EmbedBuilder()
      .setTitle("<:certo_froid:1443643346722754692> VERIFICAÇÃO")
      .setDescription(
        "**Seja bem-vindo(a)!**\n\nPara ter acesso aos canais do servidor, clique no botão abaixo e inicie seu processo de verificação.\n\n*Evite contas fakes ou suspeitas.*"
      )
      .setColor(0x007fff)
      .setImage(HEADER_IMAGE)
      .setFooter({ text: "Sistema de Segurança" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("start_verification")
        .setLabel("Verificar Agora")
        .setStyle(ButtonStyle.Success) // Botão Verde
        .setEmoji("<:mov_ok:1439456247794634845>")
    );

    // 4. Envia
    try {
      await channel.send({ embeds: [embed], components: [row] });
      await interaction.editReply(
        `✅ Painel enviado com sucesso em ${channel}!`
      );
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        "❌ Erro ao enviar painel (Verifique minhas permissões no canal)."
      );
    }
  },
};
