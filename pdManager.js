// pdManager.js
const { EmbedBuilder } = require("discord.js");
const logEmbed = require("./utils/logEmbed");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const MAX_PDS_PER_STAFF = 2;
const PREFIX = "k!";

// IDs e Configurações
const PD_ROLE_ID = "1435040530701746236";
const PD_PERMITTED_ROLES = [
  "1435040516814147715",
  "1435040517665853571",
  "1435040518571819099",
  "1435040519918059521",
];

// Configuração Visual
const HEADER_IMAGE = "LINK_DO_SEU_BANNER_NOVO_AQUI";
const COLOR_NEUTRAL = 0x2f3136;

const createFeedbackEmbed = (title, description, color = COLOR_NEUTRAL) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setImage(HEADER_IMAGE)
    .setTimestamp();
};

async function getPdData() {
  try {
    const pds = await prisma.pd.findMany();
    return { pds };
  } catch (e) {
    console.error("[DB ERROR] getPdData:", e);
    return { pds: [] };
  }
}

async function addPd(pdMemberId, staffMemberId) {
  try {
    const existing = await prisma.pd.findUnique({
      where: { memberId: pdMemberId },
    });
    if (existing) {
      return { success: false, message: "Este membro já é uma Primeira Dama." };
    }

    const currentCount = await prisma.pd.count({
      where: { staffId: staffMemberId },
    });

    if (currentCount >= MAX_PDS_PER_STAFF) {
      return {
        success: false,
        message: `Você já indicou o limite de ${MAX_PDS_PER_STAFF} Primeiras Damas.`,
      };
    }

    await prisma.pd.create({
      data: {
        memberId: pdMemberId,
        staffId: staffMemberId,
        since: new Date(),
      },
    });

    return { success: true, message: "Primeira Dama adicionada com sucesso." };
  } catch (e) {
    console.error("[DB ERROR] addPd:", e);
    return { success: false, message: "Erro de conexão com o banco de dados." };
  }
}

async function removePd(memberIdToRemove) {
  try {
    const pdToRemove = await prisma.pd.findUnique({
      where: { memberId: memberIdToRemove },
    });

    if (!pdToRemove) {
      return { success: false, pdToRemove: null };
    }

    await prisma.pd.delete({
      where: { memberId: memberIdToRemove },
    });

    return { success: true, pdToRemove };
  } catch (e) {
    console.error("[DB ERROR] removePd:", e);
    return { success: false, pdToRemove: null };
  }
}

async function handlePDCommand(message, command, args) {
  const pdData = await getPdData();
  const client = message.client;
  const authorTag = message.author.tag;

  // Busca canal de logs na ServerConfig ou no .env
  const config = await prisma.serverConfig
    .findUnique({ where: { id: "main" } })
    .catch(() => null);
  const logChannelId =
    config?.pdLogChannelId ||
    config?.logChannelId ||
    process.env.PD_LOG_CHANNEL_ID ||
    process.env.LOG_CHANNEL_ID;

  // --- k!pd ---
  if (command === "pd") {
    if (pdData.pds.length === 0) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "👑 Primeiras Damas",
            "Atualmente, não há nenhuma Primeira Dama definida.",
            0x00bfff,
          ),
        ],
      });
    }

    const pdEmbed = new EmbedBuilder()
      .setTitle("👑 Primeiras Damas Atuais do Servidor")
      .setColor(COLOR_NEUTRAL)
      .setImage(HEADER_IMAGE);

    for (const [index, pd] of pdData.pds.entries()) {
      const pdMember = await message.guild.members
        .fetch(pd.memberId)
        .catch(() => null);
      const staffUser = await client.users.fetch(pd.staffId).catch(() => null);

      const staffTag = staffUser ? staffUser.tag : "Dono Desconhecido";
      const sinceDate = new Date(pd.since).toLocaleDateString("pt-BR");

      if (pdMember) {
        pdEmbed.addFields({
          name: `🌹 #${index + 1}: ${pdMember.displayName}`,
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
          name: "❌ PD Antiga (Membro saiu)",
          value: `ID: ${pd.memberId} (Indicada por: ${staffTag})`,
          inline: true,
        });
      }
    }

    await message.channel.send({ embeds: [pdEmbed] });
    return;
  }

  // --- k!setpd ---
  if (command === "setpd") {
    const isPermitted = message.member.roles.cache.some((role) =>
      PD_PERMITTED_ROLES.includes(role.id),
    );

    if (!isPermitted) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "🔒 Sem Permissão",
            "Você não tem permissão para definir a Primeira Dama.",
          ),
        ],
      });
    }

    const memberIdentifier = args[0];
    let newPdMember = message.mentions.members.first();

    if (!newPdMember && memberIdentifier) {
      const rawId = memberIdentifier.replace(/<@!?(\d+)>/, "$1");
      if (/^\d+$/.test(rawId)) {
        newPdMember = await message.guild.members
          .fetch(rawId)
          .catch(() => null);
      }
    }

    if (!newPdMember) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "❓ Uso Incorreto",
            `Uso correto: \`${PREFIX}setpd @membro ou <ID do membro>\`.`,
          ),
        ],
      });
    }

    const pdRole = message.guild.roles.cache.get(PD_ROLE_ID);

    if (!pdRole) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "⚠️ Erro de Configuração",
            "O cargo de Primeira Dama não foi encontrado no servidor.",
          ),
        ],
      });
    }

    const { success, message: managerMessage } = await addPd(
      newPdMember.id,
      message.author.id,
    );

    if (!success) {
      return message.channel.send({
        embeds: [createFeedbackEmbed("❌ Ação Bloqueada", managerMessage)],
      });
    }

    try {
      await newPdMember.roles.add(pdRole);

      const count = await prisma.pd.count({
        where: { staffId: message.author.id },
      });
      const remaining = MAX_PDS_PER_STAFF - count;

      const successEmbed = createFeedbackEmbed(
        "✅ Sucesso!",
        `O Dono **${authorTag}** indicou ${newPdMember.user.tag} como uma **Primeira Dama**!\n\n` +
          `Você ainda pode indicar mais **${remaining >= 0 ? remaining : 0}** PDs.`,
        0x00ff00,
      );

      await message.channel.send({ embeds: [successEmbed] });

      if (logChannelId) {
        await logEmbed(
          client,
          logChannelId,
          "👑 Nova Primeira Dama Definida",
          `**${newPdMember.user.tag}** foi promovida a Primeira Dama.`,
          0xf1c40f,
          [
            { name: "🌹 PD", value: `<@${newPdMember.id}>`, inline: true },
            {
              name: "👮 Indicada por",
              value: `<@${message.author.id}>`,
              inline: true,
            },
            { name: "🔢 Vagas Restantes", value: `${remaining}`, inline: true },
          ],
          newPdMember.user.displayAvatarURL(),
        );
      }
    } catch (error) {
      console.error("Erro ao adicionar cargo de PD:", error);
      await removePd(newPdMember.id);
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "❌ Erro de Permissão",
            "Não foi possível adicionar o cargo no Discord. Verifique a hierarquia do bot.",
          ),
        ],
      });
    }
    return;
  }

  // --- k!removepd ---
  if (command === "removepd") {
    const isPermitted = message.member.roles.cache.some((role) =>
      PD_PERMITTED_ROLES.includes(role.id),
    );

    if (!isPermitted) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "🔒 Sem Permissão",
            "Você não tem permissão para remover a Primeira Dama.",
          ),
        ],
      });
    }

    const memberIdentifier = args[0];
    let targetMember = message.mentions.members.first();

    if (!targetMember && memberIdentifier) {
      const rawId = memberIdentifier.replace(/<@!?(\d+)>/, "$1");
      if (/^\d+$/.test(rawId)) {
        targetMember = await message.guild.members
          .fetch(rawId)
          .catch(() => null);
      }
    }

    if (!targetMember) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "❓ Uso Incorreto",
            `Uso correto: \`${PREFIX}removepd @membro ou <ID do membro>\`.`,
          ),
        ],
      });
    }

    const pdRole = message.guild.roles.cache.get(PD_ROLE_ID);
    const { success, pdToRemove } = await removePd(targetMember.id);
    let roleRemoved = false;

    if (targetMember.roles.cache.has(PD_ROLE_ID) && pdRole) {
      try {
        await targetMember.roles.remove(pdRole);
        roleRemoved = true;
      } catch (e) {
        return message.channel.send({
          embeds: [
            createFeedbackEmbed(
              "❌ Erro de Permissão",
              "Não consegui remover o cargo no Discord. Verifique a hierarquia.",
            ),
          ],
        });
      }
    }

    if (!success) {
      if (roleRemoved) {
        return message.channel.send({
          embeds: [
            createFeedbackEmbed(
              "⚠️ Aviso",
              "O cargo foi removido no Discord, mas o usuário não estava no banco de dados.",
            ),
          ],
        });
      } else {
        return message.channel.send({
          embeds: [
            createFeedbackEmbed(
              "❌ Não Encontrado",
              "Este membro não está registrado como Primeira Dama.",
            ),
          ],
        });
      }
    }

    const staffTag = pdToRemove?.staffId
      ? (await client.users.fetch(pdToRemove.staffId).catch(() => null))?.tag
      : "Staff Desconhecido";

    const removalEmbed = createFeedbackEmbed(
      "💔 PD Removida",
      `${targetMember.user.tag} foi removido(a) como Primeira Dama por **${authorTag}**.`,
      0xdc7633,
    );

    await message.channel.send({ embeds: [removalEmbed] });

    if (logChannelId) {
      await logEmbed(
        client,
        logChannelId,
        "💔 Primeira Dama Removida",
        `**${targetMember.user.tag}** perdeu o status de Primeira Dama.`,
        0xe74c3c,
        [
          { name: "🌹 Ex-PD", value: `<@${targetMember.id}>`, inline: true },
          {
            name: "👮 Removido por",
            value: `<@${message.author.id}>`,
            inline: true,
          },
          { name: "📜 Indicada por", value: staffTag, inline: true },
        ],
        targetMember.user.displayAvatarURL(),
      );
    }
    return;
  }
}

module.exports = {
  handlePDCommand,
  getPdData,
  addPd,
  removePd,
  MAX_PDS_PER_STAFF,
};
