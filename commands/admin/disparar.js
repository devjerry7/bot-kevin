// commands/admin/disparar.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");

const OWNER_LOG_ID = "1551147533454282806";

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
    "Envia disparo de anúncio do torneio no PV dos membros de um cargo específico.",
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

    // 2. Identificação do Cargo
    const role =
      message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);

    if (!role) {
      return message.reply(
        "⚠️ Por favor, mencione um cargo ou informe o ID. Exemplo: `mc!disparar @Membros`",
      );
    }

    // Garante a busca atualizada de todos os membros do servidor
    await message.guild.members.fetch().catch(() => {});
    const targetMembers = role.members.filter((m) => !m.user.bot);

    if (targetMembers.size === 0) {
      return message.reply(
        "⚠️ Nenhum membro humano encontrado com este cargo.",
      );
    }

    // 3. Montagem do Embed Fixo do Torneio
    const embedAnuncio = new EmbedBuilder()
      .setTitle(
        "<:am_trofeu2qn:1556881751370899457> GRANDE CAMPEONATO FREE FIRE 4X4",
      )
      .setDescription(
        `A hora de provar o nível do seu time chegou! Estão abertas as inscrições para o **Torneio 4x4**.\n\n` +
          `<:ver_dinheiro2qn:1556881769565790258> **Premiação:** R$ 200,00 no PIX\n\n` +
          `<a:008_whiteexcl:1559272726739558562> **Canais Importantes:**\n` +
          `• Dúvidas e Regras: <#1554913667483705465>\n` +
          `• Faça sua Inscrição: <#1553186399967256629> pula contra but\n\n` +
          `Garanta a vaga da sua equipe antes que esgoste!`,
      )
      .setColor(0x962dc0)
      .setThumbnail(
        "https://cdn.discordapp.com/avatars/1435303951036711064/0ae9b50d402d01d3cf3c6dbeff15350a.png?size=4096",
      )
      .setImage(
        "https://media.discordapp.net/attachments/1553534170179833951/1554904332820811907/banner-4x4.png?ex=6acfb881&is=6ace6701&hm=0aaffcacde62ae009ffdd83379b4c4dbb289a9b2713c3ecfb890c4c00a39d82e&=&format=webp&quality=lossless&width=1536&height=615",
      )
      .setFooter({ text: "2qn • Torneios Oficiais" })
      .setTimestamp();

    // 4. Painel de Prévia e Confirmação
    const rowConfirm = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_disparo")
        .setLabel(`Iniciar Disparo (${targetMembers.size} membros)`)
        .setStyle(ButtonStyle.Success)
        .setEmoji("🚀"),
      new ButtonBuilder()
        .setCustomId("cancel_disparo")
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Danger),
    );

    const previewMsg = await message.channel.send({
      content: `📋 **PRÉVIA DO DISPARO PARA O CARGO <@&${role.id}>**\nConfirme abaixo se o anúncio está correto antes de iniciar o envio em massa:`,
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
        const total = targetMembers.size;
        const membersArray = Array.from(targetMembers.values());

        const ownerUser = await message.client.users
          .fetch(OWNER_LOG_ID)
          .catch(() => null);

        if (ownerUser) {
          await ownerUser
            .send(
              `🚀 **DISPARO INICIADO**\nTarget: Cargo \`${role.name}\` (${total} membros).\nModo Ultra-Seguro ativo (Delays e Pausas por Lote).`,
            )
            .catch(() => {});
        }

        for (let i = 0; i < membersArray.length; i++) {
          const target = membersArray[i];

          try {
            await target.send({ embeds: [embedAnuncio] });
            successCount++;
          } catch (err) {
            failCount++;
          }

          processed++;

          // Atualização periódica no PV a cada 50 envios
          if (processed % 50 === 0 && ownerUser) {
            await ownerUser
              .send(
                `📊 **Progresso do Disparo:** \`${processed}/${total}\` (${Math.round((processed / total) * 100)}\%)\n🟢 Sucessos: ${successCount} | 🔴 Falhas/DM Fechada: ${failCount}`,
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
            .setTitle("✅ DISPARO EM MASSA CONCLUÍDO")
            .setDescription(
              `O envio de anúncios do campeonato foi finalizado com sucesso!\n\n` +
                `🎯 **Cargo Alvo:** \`${role.name}\`\n` +
                `👥 **Total de Membros:** \`${total}\`\n` +
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
