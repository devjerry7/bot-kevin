// src/handlers/verificationHandler.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
} = require("discord.js");
const { guildConfig } = require("../services/guildConfig");

// Constantes Visuais do Usuário
const HEADER_IMAGE_DEFAULT =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const COLOR_NEUTRAL = 0x2f3136;
const VERIFY_BUTTON_ID = "start_verification";
const APPROVE_BUTTON_ID = "approve_user";
const REJECT_BUTTON_ID = "reject_user";

module.exports = async (interaction) => {
  // Evita erro 10062 se já tiver sido respondido
  if (interaction.replied || interaction.deferred) return false;

  const { customId, guild, user } = interaction;
  const isButton = interaction.isButton();
  const isModal = interaction.isModalSubmit();

  try {
    // ====================================================
    // 1. BOTÃO "VERIFICAR" -> ABRE O MODAL
    // ====================================================
    if (isButton && customId === VERIFY_BUTTON_ID) {
      const modal = new ModalBuilder()
        .setCustomId("referral_modal")
        .setTitle("Verificação de Acesso");

      const referredUser = new TextInputBuilder()
        .setCustomId("referred_user_input")
        .setLabel("Quem convidou você?")
        .setPlaceholder("Digite o nome ou ID (Opcional)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true); // Você deixou como true no original

      modal.addComponents(new ActionRowBuilder().addComponents(referredUser));
      await interaction.showModal(modal);
      return true;
    }

    // ====================================================
    // 2. ENVIO DO MODAL -> ENVIA FICHA PARA STAFF
    // ====================================================
    if (isModal && customId === "referral_modal") {
      // Avisa o Discord que vamos processar (Evita timeout)
      await interaction.deferReply({ ephemeral: true });

      // Busca config do Banco de Dados
      const dbConfig = await guildConfig.get(guild.id);
      const referralResponse = interaction.fields.getTextInputValue(
        "referred_user_input"
      );

      // Verifica se o canal de aprovação existe no banco
      if (!dbConfig.approvalChannelId) {
        return interaction.editReply({
          content:
            "<:Nao:1443642030637977743> Erro interno: Canal de aprovação não configurado. Peça a um admin usar `/config`.",
        });
      }

      const approvalChannel = guild.channels.cache.get(
        dbConfig.approvalChannelId
      );
      if (!approvalChannel) {
        return interaction.editReply({
          content:
            "<:Nao:1443642030637977743> Erro crítico: O canal de aprovação configurado não existe mais.",
        });
      }

      // Usa a imagem do banco se tiver, senão usa a padrão
      const finalImage = dbConfig.verificationImage || HEADER_IMAGE_DEFAULT;

      const approvalEmbed = new EmbedBuilder()
        .setTitle(`Solicitação de Acesso`)
        .setThumbnail(user.displayAvatarURL())
        .setImage(finalImage)
        .addFields(
          { name: "Usuário", value: `${user} (\`${user.id}\`)`, inline: true },
          {
            name: "Referência",
            value: `\`${referralResponse}\``,
            inline: true,
          },
          { name: "Status", value: "🟡 Aguardando Análise" }
        )
        .setColor(COLOR_NEUTRAL)
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(APPROVE_BUTTON_ID)
          .setLabel("Aprovar Acesso")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:certo_froid:1443643346722754692>"),
        new ButtonBuilder()
          .setCustomId(REJECT_BUTTON_ID)
          .setLabel("Recusar Acesso")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("⛔")
      );

      // Monta menção de cargos baseada no Banco de Dados
      let mentionText = "";
      if (dbConfig.approverRoleId)
        mentionText += `<@&${dbConfig.approverRoleId}> `;
      if (dbConfig.secondaryApproverRoleId)
        mentionText += `<@&${dbConfig.secondaryApproverRoleId}>`;
      if (!mentionText)
        mentionText = "@here (Cargos de aprovação não definidos)";

      await approvalChannel.send({
        content: mentionText,
        embeds: [approvalEmbed],
        components: [row],
      });

      return interaction.editReply({
        content: `<:certo_froid:1443643346722754692> Sua solicitação foi enviada para a equipe. Aguarde.`,
      });
    }

    // ====================================================
    // 3. BOTÕES APROVAR/REJEITAR (STAFF)
    // ====================================================
    if (isButton && [APPROVE_BUTTON_ID, REJECT_BUTTON_ID].includes(customId)) {
      // Importante: Defer Update (pois vamos editar a mensagem da staff)
      await interaction.deferUpdate();

      const dbConfig = await guildConfig.get(guild.id);
      const member = interaction.member;

      // Verificação de Permissão (Hierarquia)
      const hasPerm =
        member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        (dbConfig.approverRoleId &&
          member.roles.cache.has(dbConfig.approverRoleId)) ||
        (dbConfig.secondaryApproverRoleId &&
          member.roles.cache.has(dbConfig.secondaryApproverRoleId)) ||
        (dbConfig.staffTrustedRoles &&
          dbConfig.staffTrustedRoles.includes(member.roles.highest.id)); // Fallback simples

      if (!hasPerm) {
        return interaction.followUp({
          content: "🔒 Sem permissão.",
          ephemeral: true,
        });
      }

      // Pega o ID do usuário alvo de dentro do Embed (Regex)
      const embed = EmbedBuilder.from(interaction.message.embeds[0]);
      const targetId = embed.data.fields
        .find((f) => f.name === "Usuário" || f.name === "Membro")
        ?.value.match(/\d{17,20}/)?.[0];

      if (!targetId) {
        return interaction.followUp({
          content: "Erro: Não foi possível achar o ID no embed.",
          ephemeral: true,
        });
      }

      const targetMember = await guild.members
        .fetch(targetId)
        .catch(() => null);

      // Se o usuário saiu do servidor
      if (!targetMember) {
        embed.data.fields.find((f) => f.name === "Status").value =
          "<:Nao:1443642030637977743> Usuário saiu do servidor";
        return interaction.editReply({ embeds: [embed], components: [] });
      }

      // --- APROVAÇÃO ---
      if (customId === APPROVE_BUTTON_ID) {
        if (dbConfig.verifiedRoleId) {
          await targetMember.roles.add(dbConfig.verifiedRoleId).catch((err) => {
            console.error("Erro ao dar cargo:", err);
            interaction.followUp({
              content: "Erro de hierarquia ao dar cargo.",
              ephemeral: true,
            });
          });
        }

        // Atualiza Embed
        embed.data.fields.find(
          (f) => f.name === "Status"
        ).value = `<:certo_froid:1443643346722754692> Aprovado por ${interaction.user.username}`;
        embed.setColor(0x57f287); // Verde Discord

        // Log (se configurado)
        if (dbConfig.approvedLogChannelId) {
          const logChannel = guild.channels.cache.get(
            dbConfig.approvedLogChannelId
          );
          if (logChannel)
            logChannel.send({
              content: `<:certo_froid:1443643346722754692> Acesso liberado: ${targetMember}`,
              embeds: [embed],
            });
        }

        // Avisa o membro (opcional, pode descomentar se quiser)
        // await targetMember.send("Seu acesso foi aprovado!").catch(() => {});
      } else {
        // --- REJEIÇÃO ---
        embed.data.fields.find(
          (f) => f.name === "Status"
        ).value = `⛔ Recusado por ${interaction.user.username}`;
        embed.setColor(0xed4245); // Vermelho Discord

        await targetMember
          .send(
            `Sua solicitação de acesso em **${guild.name}** foi recusada pela liderança. Fora paneleiro.`
          )
          .catch(() => {});
      }

      await interaction.editReply({ embeds: [embed], components: [] });
      return true;
    }
  } catch (error) {
    console.error("Erro no verificationHandler:", error);
    // Se der erro desconhecido, tenta avisar (se não tiver respondido ainda)
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({ content: "❌ Ocorreu um erro interno.", ephemeral: true })
        .catch(() => {});
    }
  }

  return false;
};
