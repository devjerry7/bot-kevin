// commands/admin/disparar.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");

const OWNER_LOG_ID = "1551147533454282806";
const LOJA_CHANNEL_ID = "1570902792938332220";
const MYLOOT_LINK = "https://www.mybioz.com/loot/2qn?vincular=discord";

// Auxiliar Whitelist
const getWhitelistIds = () => {
  const whitelistEnv = process.env.WHITELIST_IDS || "";
  return whitelistEnv
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
};

// Função de pausa (delay)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  name: "disparar",
  description:
    "Envia disparo curto de anúncio do sistema de pontos em call no PV dos membros dos cargos informados (com deduplicação).",
  async execute(message, args) {
    // 1. Validação de Whitelist
    const whitelist = getWhitelistIds();
    if (
      !whitelist.includes(message.author.id) &&
      message.author.id !== OWNER_LOG_ID
    ) {
      return message.reply(
        "❌ Apenas membros da Whitelist podem acionar disparos em massa.",
      );
    }

    // 2. Identificação dos Cargos (Menções ou IDs passados nos argumentos)
    const roleMentions = message.mentions.roles;
    const roleIdsFromArgs = args.filter((arg) => /^\d{17,20}$/.test(arg));

    const rolesToTarget = [];

    roleMentions.forEach((role) => {
      if (!rolesToTarget.some((r) => r.id === role.id))
        rolesToTarget.push(role);
    });

    for (const rId of roleIdsFromArgs) {
      const foundRole = message.guild.roles.cache.get(rId);
      if (foundRole && !rolesToTarget.some((r) => r.id === foundRole.id)) {
        rolesToTarget.push(foundRole);
      }
    }

    if (rolesToTarget.length === 0) {
      return message.reply(
        "⚠️ Por favor, informe pelo menos um cargo válido ou menção. Exemplo: `mc!disparar 1550589449082245161 1566521751704178749`",
      );
    }

    // Garante a busca atualizada de todos os membros do servidor
    await message.guild.members.fetch().catch(() => {});

    // Coleta membros únicos de todos os cargos informados (evitando duplicatas)
    const uniqueMembersMap = new Map();

    for (const role of rolesToTarget) {
      role.members.forEach((member) => {
        if (!member.user.bot) {
          uniqueMembersMap.set(member.id, member);
        }
      });
    }

    const targetMembersArray = Array.from(uniqueMembersMap.values());

    if (targetMembersArray.length === 0) {
      return message.reply(
        "⚠️ Nenhum membro humano foi encontrado nos cargos informados.",
      );
    }

    const rolesNamesFormatted = rolesToTarget
      .map((r) => `\`@${r.name}\``)
      .join(", ");

    // 3. Montagem do Embed Curto e Objetivo
    const embedAnuncio = new EmbedBuilder()
      .setTitle(
        "<:00roxo2qnavisos:1556916486398939186> GANHE PRÊMIOS FICANDO EM CALL NA 2QN!",
      )
      .setDescription(
        `Agora o seu tempo em call na **2qn** vale recompensas reais! <a:01roxo1_heart2qn:1560755540710260776>\n\n` +
          `<:04branco_ponto2qn:1556901316230651954> **1 minuto em call = 1 ponto** acumulado automaticamente.\n` +
          `<:04branco_ponto2qn:1556901316230651954> Troque seus pontos por **Gift Cards, VIPs e itens de jogos**.\n` +
          `<:04branco_ponto2qn:1556901316230651954> **Todas as informações** e regras completas estão no chat da loja: <#${LOJA_CHANNEL_ID}>\n\n` +
          `<:04branco_st2QN:1560333704298242118> Vincule sua conta pelo botão abaixo e comece a acumular!`,
      )
      .setColor(0x962dc0)
      .setImage(
        "https://cdn.discordapp.com/attachments/1553534170179833951/1569957900795777065/2QN_Banner_oficial.png?ex=6af558bb&is=6af4073b&hm=b14b7ec140df16ba68f4eea0da89934fd3fd3aef324b69e7454b3ad04bc5aecc&",
      )
      .setFooter({
        text: "2qn • meu caráter não tem nada a ver com meu instinto",
      })
      .setTimestamp();

    // Botão de Link para acompanhar o Embed na DM dos membros
    const rowLinkDm = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Vincular Conta na MyLoot")
        .setStyle(ButtonStyle.Link)
        .setURL(MYLOOT_LINK)
        .setEmoji("🎁"),
    );

    // 4. Painel de Prévia e Confirmação
    const rowConfirm = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_disparo")
        .setLabel(
          `Iniciar Disparo (${targetMembersArray.length} membros únicos)`,
        )
        .setStyle(ButtonStyle.Success)
        .setEmoji("🚀"),
      new ButtonBuilder()
        .setCustomId("cancel_disparo")
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Danger),
    );

    const previewMsg = await message.channel.send({
      content: `📋 **PRÉVIA DO DISPARO PARA OS CARGOS:**\n${rolesNamesFormatted}\n*(Total de membros únicos após remoção de duplicatas: **${targetMembersArray.length}**)*\n\nConfirme abaixo se a mensagem está correta antes de iniciar o envio:`,
      embeds: [embedAnuncio],
      components: [rowConfirm],
    });

    const collector = previewMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "❌ Apenas quem executou o comando pode confirmar.",
          ephemeral: true,
        });
      }

      if (interaction.customId === "cancel_disparo") {
        await interaction.update({
          content: "❌ Disparo cancelado com sucesso.",
          embeds: [],
          components: [],
        });
        return collector.stop();
      }

      if (interaction.customId === "confirm_disparo") {
        await interaction.update({
          content: `⏳ **Disparo iniciado em segundo plano!** O progresso e relatório final serão enviados no seu PV (<@${OWNER_LOG_ID}>).`,
          components: [],
        });
        collector.stop();

        // 5. Início do Algoritmo de Envio em Fila Seguro
        let successCount = 0;
        let failCount = 0;
        let processed = 0;
        const total = targetMembersArray.length;

        const ownerUser = await message.client.users
          .fetch(OWNER_LOG_ID)
          .catch(() => null);

        if (ownerUser) {
          await ownerUser
            .send(
              `🚀 **DISPARO DE PONTOS EM CALL INICIADO**\nAlvos: ${rolesNamesFormatted} (${total} membros únicos).\nModo Ultra-Seguro ativo (Delays e Pausas por Lote).`,
            )
            .catch(() => {});
        }

        for (let i = 0; i < targetMembersArray.length; i++) {
          const target = targetMembersArray[i];

          try {
            await target.send({
              embeds: [embedAnuncio],
              components: [rowLinkDm],
            });
            successCount++;
          } catch (err) {
            failCount++;
          }

          processed++;

          // Atualização periódica no PV a cada 50 envios
          if (processed % 50 === 0 && ownerUser) {
            await ownerUser
              .send(
                `📊 **Progresso do Disparo (Pontos em Call):** \`${processed}/${total}\` (${Math.round((processed / total) * 100)}\%)\n🟢 Sucessos: ${successCount} | 🔴 Falhas/DM Fechada: ${failCount}`,
              )
              .catch(() => {});
          }

          // Delay Seguro Individual entre DMs (3 a 4.5 segundos)
          const randomDelay = Math.floor(Math.random() * 1500) + 3000;
          await sleep(randomDelay);

          // Pausa Estratégica de Lote: A cada 20 mensagens, descansa 2 minutos (120.000 ms)
          if (processed % 20 === 0 && processed < total) {
            if (ownerUser) {
              await ownerUser
                .send(
                  `⏳ **Pausa de Segurança:** Lote de 20 DMs atingido. Aguardando 2 minutos para esfriar na API do Discord...`,
                )
                .catch(() => {});
            }
            await sleep(120000);
          }
        }

        // 6. Relatório Final no PV do Dono
        if (ownerUser) {
          const reportEmbed = new EmbedBuilder()
            .setTitle("✅ DISPARO DE PONTOS EM CALL CONCLUÍDO")
            .setDescription(
              `O envio de anúncios do sistema de pontos em call foi finalizado com sucesso!\n\n` +
                `🎯 **Cargos Alvo:** ${rolesNamesFormatted}\n` +
                `👥 **Total de Membros Únicos:** \`${total}\`\n` +
                `🟢 **Entregues no PV:** \`${successCount}\`\n` +
                `🔴 **DMs Fechadas / Erros:** \`${failCount}\``,
            )
            .setColor(0x00ff00)
            .setTimestamp();

          await ownerUser.send({ embeds: [reportEmbed] }).catch(() => {});
        }
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        await previewMsg
          .edit({
            content:
              "⏰ Tempo limite de confirmação esgotado. Disparo cancelado.",
            components: [],
          })
          .catch(() => {});
      }
    });
  },
};
