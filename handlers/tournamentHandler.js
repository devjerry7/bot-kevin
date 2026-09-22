// handlers/tournamentHandler.js
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const TournamentService = require("../services/tournamentService");

module.exports = async function handleTournamentInteractions(interaction) {
  try {
    // ----------------------------------------------------
    // A) CLIQUE NO BOTÃO "INSCREVER EQUIPE" -> ABRE MODAL
    // ----------------------------------------------------
    if (
      interaction.isButton() &&
      interaction.customId === "btn_inscrever_equipe"
    ) {
      const modal = new ModalBuilder()
        .setCustomId("modal_inscricao_equipe")
        .setTitle("Inscrição de Equipe - Camp 4x4");

      const inputTeamName = new TextInputBuilder()
        .setCustomId("input_team_name")
        .setLabel("Nome da Equipe")
        .setPlaceholder("Ex: Fluxo, Loud, OsCria...")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputPlayers = new TextInputBuilder()
        .setCustomId("input_players")
        .setLabel("4 Jogadores (@Discord - Nick no Jogo)")
        .setPlaceholder(
          "Exemplo (1 por linha):\n" +
            "@Membro1 - FLX_Nobru\n" +
            "@Membro2 - FLX_Bak\n" +
            "@Membro3 - FLX_Thurzin\n" +
            "@Membro4 - FLX_Coringa",
        )
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const inputEmulators = new TextInputBuilder()
        .setCustomId("input_emulators")
        .setLabel("Quem usa Emulador? (Máx 2)")
        .setPlaceholder(
          "Ex: @Membro2, @Membro3 (deixe em branco se forem Mobile)",
        )
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(inputTeamName),
        new ActionRowBuilder().addComponents(inputPlayers),
        new ActionRowBuilder().addComponents(inputEmulators),
      );

      return await interaction.showModal(modal);
    }

    // ----------------------------------------------------
    // B) SUBMISSÃO DO FORMULÁRIO (MODAL)
    // ----------------------------------------------------
    if (
      interaction.isModalSubmit() &&
      interaction.customId === "modal_inscricao_equipe"
    ) {
      await interaction.deferReply({ flags: 64 }); // Resposta efêmera (privada)

      const teamName = interaction.fields
        .getTextInputValue("input_team_name")
        .trim();
      const rawPlayers = interaction.fields.getTextInputValue("input_players");
      const rawEmulators =
        interaction.fields.getTextInputValue("input_emulators") || "";

      // Helper para extrair IDs do Discord de um texto
      const extractIds = (text) => {
        const matches = text.match(/\d{17,19}/g);
        return matches ? [...new Set(matches)] : [];
      };

      const emulatorIds = extractIds(rawEmulators);

      // Separa o texto por linhas e remove linhas vazias
      const lines = rawPlayers
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length !== 4) {
        return await interaction.editReply({
          content: `<:serv:1545444524241719376> **Formato Inválido:** Você precisa enviar exatamente 4 linhas (uma para cada jogador).\n\n**Exemplo correto:**\n@Membro1 - NickNoJogo1\n@Membro2 - NickNoJogo2\n@Membro3 - NickNoJogo3\n@Membro4 - NickNoJogo4`,
        });
      }

      const playersData = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const discordMatch = line.match(/\d{17,19}/);

        if (!discordMatch) {
          return await interaction.editReply({
            content: `<:serv:1545444524241719376> **Erro na Linha ${i + 1}:** Não foi encontrada uma menção (@usuario) ou ID válido do Discord no trecho: \`${line}\`.`,
          });
        }

        const discordId = discordMatch[0];

        // Remove a menção/ID do Discord e caracteres de separação para obter o Nick do jogo limpo
        let gameNick = line
          .replace(/<@!?\d+>|\d{17,19}/g, "")
          .replace(/^[\s\-:|]+|[\s\-:|]+$/g, "")
          .trim();

        if (!gameNick) {
          gameNick = `Jogador_${i + 1}`;
        }

        playersData.push({
          discordId,
          gameNick,
          device: emulatorIds.includes(discordId) ? "EMULATOR" : "MOBILE",
        });
      }

      // Validação: Capitão (quem enviou) deve estar entre os 4
      const captainInList = playersData.some(
        (p) => p.discordId === interaction.user.id,
      );
      if (!captainInList) {
        return await interaction.editReply({
          content: `<:serv:1545444524241719376> **Atenção Capitão:** Você (<@${interaction.user.id}>) precisa se incluir na lista de 4 jogadores!`,
        });
      }

      const tournament = await TournamentService.getOrCreateActiveTournament(
        interaction.user.id,
      );

      // Chama o serviço do campeonato
      const team = await TournamentService.registerTeam({
        tournamentId: tournament.id,
        teamName,
        captainId: interaction.user.id,
        playersData,
      });

      if (team.status === "WAITLIST") {
        return await interaction.editReply({
          content: `<:serv:1545494059081142403> **Vagas Principais Esgotadas!**\nA equipe **${team.name}** foi registrada na **Lista de Espera** (Posição #${team.waitlistOrder}). Se surgir uma vaga, vocês serão notificados!`,
        });
      }

      // Lista formatada com os dados vinculados
      const playersFormattedList = team.players
        .map(
          (p) =>
            `• <@${p.discordId}> | **Nick no Jogo:** \`${p.gameNick}\` (${p.device === "EMULATOR" ? "💻 Emulador" : "📱 Mobile"})`,
        )
        .join("\n");

      const embedSucesso = new EmbedBuilder()
        .setTitle(
          "<:serv:1545501461427785798> Inscrição Pré-Registrada com Sucesso!",
        )
        .setDescription(
          `**Equipe:** ${team.name}\n` +
            `**Capitão:** <@${team.captainId}>\n\n` +
            `<:serv:1537237908547965001> **Jogadores Escalados:**\n${playersFormattedList}\n\n` +
            `<:serv:1545458280145354863> **Passo Final para Confirmar a Vaga:**\n` +
            `Realize o pagamento da taxa de **R$ ${tournament.registrationFee.toFixed(2)}** via PIX e envie o comprovante pelo botão abaixo.\n\n` +
            `<:serv:1542026399953457172> **Chave PIX:** \`pix@2qn.com.br\`\n` +
            `<:serv:1542026405481684994> **Titular:** 2QN Torneios`,
        )
        .setColor(0x00ffcc)
        .setFooter({ text: "Aguardando envio de comprovante" });

      const rowPayment = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`btn_enviar_comprovante_${team.id}`)
          .setLabel("<:serv:1545488990168158350> ENVIAR COMPROVANTE")
          .setStyle(ButtonStyle.Primary),
      );

      return await interaction.editReply({
        embeds: [embedSucesso],
        components: [rowPayment],
      });
    }
  } catch (err) {
    console.error("[ERRO TOURNAMENT INTERACTION]", err);
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply({
        content: `<:serv:1545444524241719376> Erro: ${err.message}`,
      });
    }
  }
};
