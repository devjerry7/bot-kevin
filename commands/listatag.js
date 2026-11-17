// commands/listatag.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");
const config = require("../config");

const ITEMS_PER_PAGE = 20;

module.exports = {
  name: "listatag",
  aliases: ["listatags", "tagmembros"],

  async execute(message) {
    const guild = message.guild;
    if (!guild) return;

    const COLOR_BASE = process.env.COLOR_BASE
      ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
      : config.colorInfo || 0x00e5ff;

    // 1. Verifica permissão (Staff / Gerenciar Servidor ou Cargos)
    const isStaff =
      message.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
      message.member.permissions.has(PermissionFlagsBits.ManageRoles) ||
      message.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isStaff) {
      return message.channel
        .send({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Sem Permissão")
              .setDescription(
                "Apenas membros da **equipe** podem utilizar este comando.",
              )
              .setColor(0xff0000),
          ],
        })
        .then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
    }

    const loadingMsg = await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            "🔍 Buscando membros que estão usando a tag do servidor...",
          )
          .setColor(COLOR_BASE),
      ],
    });

    try {
      // 2. Garante que todos os membros do servidor estejam carregados
      const allMembers = await guild.members.fetch();

      // 3. Filtra apenas humanos com a tag deste servidor equipada e visível
      const taggedMembers = Array.from(
        allMembers
          .filter(
            (m) =>
              !m.user.bot &&
              m.user.primaryGuild?.identityGuildId === guild.id &&
              m.user.primaryGuild?.identityEnabled === true,
          )
          .values(),
      );

      // Pega o texto da tag do primeiro membro encontrado (ex: "2QN")
      const serverTagText =
        taggedMembers[0]?.user?.primaryGuild?.tag || guild.name;

      if (taggedMembers.length === 0) {
        return loadingMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setTitle(
                `<:01roxo1_pessoinha2qn:1537237908547965001> Membros com a Tag [${serverTagText}]`,
              )
              .setDescription(
                "Nenhum membro está utilizando a tag deste servidor no momento.",
              )
              .setColor(COLOR_BASE)
              .setTimestamp(),
          ],
        });
      }

      // 4. Ordena alfabeticamente pelo nome de exibição
      taggedMembers.sort((a, b) =>
        a.displayName.localeCompare(b.displayName, "pt-BR"),
      );

      const totalPages = Math.ceil(taggedMembers.length / ITEMS_PER_PAGE);
      let currentPage = 0;

      const buildPageEmbed = (page) => {
        const start = page * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const slice = taggedMembers.slice(start, end);

        const lines = slice.map((member, idx) => {
          const position = start + idx + 1;
          return `\`${String(position).padStart(2, "0")}.\` ${member} — \`${member.user.username}\` (\`${member.id}\`)`;
        });

        return new EmbedBuilder()
          .setTitle(
            `<:01roxo1_pessoinha2qn:1537237908547965001> Membros usando a Tag [${serverTagText}]`,
          )
          .setDescription(
            `**Total utilizando a tag:** \`${taggedMembers.length}\` membro(s)\n\n` +
              lines.join("\n"),
          )
          .setColor(COLOR_BASE)
          .setFooter({
            text: `Página ${page + 1} de ${totalPages} • Solicitado por ${message.author.username}`,
            iconURL: guild.iconURL({ dynamic: true }) || undefined,
          })
          .setTimestamp();
      };

      const buildButtons = (page, disabled = false) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("taglist_prev")
            .setLabel("◀ Anterior")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page === 0),
          new ButtonBuilder()
            .setCustomId("taglist_next")
            .setLabel("Próxima ▶")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page >= totalPages - 1),
        );
      };

      const components = totalPages > 1 ? [buildButtons(currentPage)] : [];

      const replyMessage = await loadingMsg.edit({
        embeds: [buildPageEmbed(currentPage)],
        components,
      });

      // 5. Se houver mais de 1 página, ativa o coletor de botões por 2 minutos
      if (totalPages > 1) {
        const collector = replyMessage.createMessageComponentCollector({
          filter: (i) => i.user.id === message.author.id,
          time: 120_000,
        });

        collector.on("collect", async (interaction) => {
          if (interaction.customId === "taglist_prev" && currentPage > 0) {
            currentPage--;
          } else if (
            interaction.customId === "taglist_next" &&
            currentPage < totalPages - 1
          ) {
            currentPage++;
          }

          await interaction.update({
            embeds: [buildPageEmbed(currentPage)],
            components: [buildButtons(currentPage)],
          });
        });

        collector.on("end", async () => {
          await replyMessage
            .edit({
              components: [buildButtons(currentPage, true)],
            })
            .catch(() => {});
        });
      }
    } catch (error) {
      console.error("[LISTATAG ERROR]:", error);
      await loadingMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro ao Listar Tag")
            .setDescription(
              "Não foi possível buscar os membros com a tag no momento.",
            )
            .setColor(0xff0000),
        ],
      });
    }
  },
};
