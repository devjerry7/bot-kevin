// commands/rodarRelatorio.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const prisma = require("../database"); // Importa o Prisma centralizado
const streamerConfig = require("../config/streamerConfig");

// IDs dos donos/diretoria que receberão o relatório no PV
const OWNER_IDS = ["1551147533454282806", "697947696702554223"];

module.exports = {
  name: "rodarrelatorio",
  description:
    "Dispara manualmente o relatório semanal de streamers para a diretoria e reseta os contadores.",
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

    // Validação de segurança: Apenas Administradores ou o cargo de gerência
    const MANAGER_ROLE_ID = "1550589449082245161";
    const canRun =
      message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      message.member.roles.cache.has(MANAGER_ROLE_ID);

    if (!canRun) {
      return message.channel.send({
        embeds: [
          createEmbed(
            "<:br_errado2qn:1556905095919050762> Permissão Negada",
            "Apenas administradores ou cargos autorizados podem forçar o relatório semanal.",
            COLOR_ERROR,
          ),
        ],
      });
    }

    try {
      await message.channel.send({
        embeds: [
          createEmbed(
            "⏳ Gerando Relatório...",
            "Buscando dados dos streamers no banco e preparando os blocos de envio...",
          ),
        ],
      });

      // Busca todos os streamers cadastrados no banco
      const streamers = await prisma.streamer.findMany({
        where: { enabled: true },
      });

      if (streamers.length === 0) {
        return message.channel.send({
          embeds: [
            createEmbed(
              "⚠️ Aviso",
              "Não há nenhum streamer ativo cadastrado no banco de dados.",
              COLOR_ERROR,
            ),
          ],
        });
      }

      const goalHours = streamerConfig.goals.weeklyVoiceHours;
      const goalInvites = streamerConfig.goals.weeklyInvites;

      // Monta os blocos de texto individuais para cada streamer
      const streamerChunks = [];
      let currentChunk = "";

      for (const s of streamers) {
        const hoursInCall = Number(
          ((s.weeklyVoiceMinutes || 0) / 60).toFixed(1),
        );
        const invites = s.weeklyInvites || 0;

        const metVoice = hoursInCall >= goalHours;
        const metInvites = invites >= goalInvites;

        const statusIcon =
          metVoice && metInvites
            ? "<:br_correto2qn:1556905093729882217> **Meta Cumprida**"
            : "<:br_errado2qn:1556905095919050762> **Meta Incompleta**";

        const streamerTag = s.discordUserId
          ? `<@${s.discordUserId}>`
          : s.displayName || "Streamer";
        const displayName = s.displayName || "Sem Nome";

        const streamerText =
          `<:pr_pessoinha2qn:1542026405481684994> **${streamerTag}** (${displayName})\n` +
          `• Call: \`${hoursInCall}h\` / \`${goalHours}h\` ${metVoice ? "<:br_correto2qn:1556905093729882217>" : "<:br_errado2qn:1556905095919050762>"}\n` +
          `• Convites: \`${invites}\` / \`${goalInvites}\` ${metInvites ? "<:br_correto2qn:1556905093729882217>" : "<:br_errado2qn:1556905095919050762>"}\n` +
          `• Resultado: ${statusIcon}\n\n`;

        // Se passar de 3500 caracteres num único bloco, guarda e inicia outro (margem de segurança para o limite de 4096)
        if ((currentChunk + streamerText).length > 3500) {
          streamerChunks.push(currentChunk);
          currentChunk = streamerText;
        } else {
          currentChunk += streamerText;
        }
      }

      if (currentChunk.length > 0) {
        streamerChunks.push(currentChunk);
      }

      // Cria as embeds baseadas nos blocos gerados
      const embedsToSend = streamerChunks.map((chunk, index) => {
        return new EmbedBuilder()
          .setTitle(
            `<a:am_trofelzinho:1556881756521766934> Relatório Semanal de Desempenho (Manual) [Parte ${index + 1}/${streamerChunks.length}]`,
          )
          .setDescription(
            index === 0
              ? `<:br_registro2qn:1557798191100072119> **Fechamento Manual de Streamers (Forçado)**\n\n${chunk}`
              : chunk,
          )
          .setColor(COLOR_BASE)
          .setTimestamp();
      });

      // Dispara todas as embeds no PV de cada administrador configurado
      let sentCount = 0;
      for (const ownerId of OWNER_IDS) {
        try {
          const user = await message.client.users.fetch(ownerId);
          if (user) {
            for (const embed of embedsToSend) {
              await user.send({ embeds: [embed] });
            }
            sentCount++;
          }
        } catch (err) {
          console.error(
            `[ManualReport] Falha ao enviar PV para o ID ${ownerId}:`,
            err.message,
          );
        }
      }

      return message.channel.send({
        embeds: [
          createEmbed(
            "✅ Relatório Enviado com Sucesso!",
            `O relatório completo (dividido em \`${embedsToSend.length}\` parte(s)) foi disparado no PV de \`${sentCount}\` administradores.`,
          ),
        ],
      });
    } catch (error) {
      console.error("[ManualReport ERROR]:", error);
      return message.channel.send({
        embeds: [
          createEmbed(
            "❌ Erro Crítico",
            `Falha ao gerar o relatório:\n\`\`\`js\n${error.message}\n\`\`\``,
            COLOR_ERROR,
          ),
        ],
      });
    }
  },
};
