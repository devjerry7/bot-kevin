// src/handlers/verificationHandler.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionsBitField,
} = require("discord.js");
const { guildConfig } = require("../services/guildConfig");

const HEADER_IMAGE_DEFAULT =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png";
const COLOR_NEUTRAL = 0x2f3136;
const VERIFY_BUTTON_ID = "start_verification";
const SELECT_REFERRAL_ID = "verify_select_referral";
const APPROVE_BUTTON_ID = "approve_user";
const REJECT_BUTTON_ID = "reject_user";

module.exports = async (interaction) => {
  if (interaction.replied || interaction.deferred) return false;

  const { customId, guild, user, member } = interaction;

  try {
    // 1. BOTÃO "VERIFICAR"
    if (interaction.isButton() && customId === VERIFY_BUTTON_ID) {
      const dbConfig = await guildConfig.get(guild.id);

      if (!dbConfig.approverRoleId) {
        return interaction.reply({
          content:
            "<:Nao:1443642030637977743> Erro: O cargo de aprovador não foi configurado no /config.",
          ephemeral: true,
        });
      }

      await guild.members.fetch();
      const approvers = guild.members.cache.filter((m) =>
        m.roles.cache.has(dbConfig.approverRoleId),
      );

      if (approvers.size === 0) {
        return interaction.reply({
          content:
            "<:Nao:1443642030637977743> Não há membros dono com o cargo necessário para apadrinhar.",
          ephemeral: true,
        });
      }

      const options = approvers
        .map((m) => ({
          label: m.displayName,
          value: m.id,
          description: `Selecionar ${m.displayName} como referência.`,
        }))
        .slice(0, 25);

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(SELECT_REFERRAL_ID)
          .setPlaceholder("Selecione quem conhece você (dono)")
          .addOptions(options),
      );

      await interaction.reply({
        content:
          "✨ **Verificação:** Selecione abaixo qual membro da dono conhece você:",
        components: [row],
        ephemeral: true,
      });
      return true;
    }

    // 2. SELEÇÃO DA REFERÊNCIA -> ENVIO PARA O CANAL DE APROVAÇÃO
    if (interaction.isStringSelectMenu() && customId === SELECT_REFERRAL_ID) {
      await interaction.deferUpdate();

      const dbConfig = await guildConfig.get(guild.id);
      const referredUserId = interaction.values[0];
      const referralMember = await guild.members
        .fetch(referredUserId)
        .catch(() => null);

      // Verificação de Segurança do Canal de Aprovação
      const approvalChannel = guild.channels.cache.get(
        dbConfig.approvalChannelId,
      );

      if (!approvalChannel) {
        console.error(
          `[ERRO] Canal de aprovação (ID: ${dbConfig.approvalChannelId}) não encontrado.`,
        );
        return interaction.editReply({
          content:
            "❌ Erro crítico: O canal de aprovação não existe ou não foi configurado corretamente.",
          components: [],
        });
      }

      const finalImage = dbConfig.verificationImage || HEADER_IMAGE_DEFAULT;
      const approvalEmbed = new EmbedBuilder()
        .setTitle(`Solicitação de Acesso`)
        .setThumbnail(user.displayAvatarURL())
        .setImage(finalImage)
        .addFields(
          { name: "Usuário", value: `${user} (\`${user.id}\`)`, inline: true },
          { name: "Referência", value: `<@${referredUserId}>`, inline: true },
          { name: "Status", value: "🟡 Aguardando Análise" },
        )
        .setColor(COLOR_NEUTRAL)
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(APPROVE_BUTTON_ID)
          .setLabel("Aprovar")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:certo_froid:1443643346722754692>"),
        new ButtonBuilder()
          .setCustomId(REJECT_BUTTON_ID)
          .setLabel("Recusar")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("⛔"),
      );

      // Envio Seguro (Aqui acontecia o erro caso o approvalChannel fosse undefined)
      await approvalChannel
        .send({
          content: `🔔 <@${referredUserId}>, o usuário ${user} marcou você como referência.`,
          embeds: [approvalEmbed],
          components: [row],
        })
        .catch((e) =>
          console.error("Erro ao enviar mensagem para aprovação:", e),
        );

      return interaction.editReply({
        content: `<:certo_froid:1443643346722754692> Solicitação enviada! O padrinho **${referralMember?.displayName || "dono"}** foi marcado.`,
        components: [],
      });
    }

    // 3. BOTÕES APROVAR/REJEITAR
    if (
      interaction.isButton() &&
      [APPROVE_BUTTON_ID, REJECT_BUTTON_ID].includes(customId)
    ) {
      await interaction.deferUpdate();

      const dbConfig = await guildConfig.get(guild.id);

      const hasPerm =
        member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        (dbConfig.approverRoleId &&
          member.roles.cache.has(dbConfig.approverRoleId)) ||
        (dbConfig.secondaryApproverRoleId &&
          member.roles.cache.has(dbConfig.secondaryApproverRoleId));

      if (!hasPerm)
        return interaction.followUp({
          content: "🔒 Sem permissão.",
          ephemeral: true,
        });

      const embed = EmbedBuilder.from(interaction.message.embeds[0]);
      const targetId = embed.data.fields
        .find((f) => f.name === "Usuário")
        ?.value.match(/\d{17,20}/)?.[0];
      const targetMember = await guild.members
        .fetch(targetId)
        .catch(() => null);

      if (!targetMember) {
        embed.data.fields.find((f) => f.name === "Status").value =
          "<:Nao:1443642030637977743> Usuário saiu do servidor";
        return interaction.editReply({ embeds: [embed], components: [] });
      }

      if (customId === APPROVE_BUTTON_ID) {
        if (dbConfig.verifiedRoleId)
          await targetMember.roles.add(dbConfig.verifiedRoleId).catch(() => {});

        embed.data.fields.find((f) => f.name === "Status").value =
          `<:certo_froid:1443643346722754692> Aprovado por ${member.displayName}`;
        embed.setColor(0x57f287);

        // ✅ LOG SEGURO (Prevenção do erro 'reading send')
        if (dbConfig.approvedLogChannelId) {
          const logChannel = guild.channels.cache.get(
            dbConfig.approvedLogChannelId,
          );
          if (logChannel) {
            await logChannel
              .send({
                content: `<:certo_froid:1443643346722754692> Acesso liberado: ${targetMember}`,
                embeds: [embed],
              })
              .catch(() => {});
          }
        }
      } else {
        embed.data.fields.find((f) => f.name === "Status").value =
          `⛔ Recusado por ${member.displayName}`;
        embed.setColor(0xed4245);
        await targetMember
          .send(
            `Sua solicitação em **${guild.name}** foi recusada pela liderança.`,
          )
          .catch(() => {});
      }

      await interaction.editReply({ embeds: [embed], components: [] });
      return true;
    }
  } catch (error) {
    console.error("Erro no verificationHandler:", error);
  }
  return false;
};
