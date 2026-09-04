// handlers/stopGameHandler.js
const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
} = require("discord.js");
const { getGameState } = require("../game/gameState");
const {
  calculateScores,
  FINALIZE_BUTTON_ID,
  EDIT_BUTTON_ID,
  INVALIDATE_MODAL_ID,
  PLAYER_INPUT_ID,
  CATEGORY_INPUT_ID,
  postReviewEmbed,
} = require("../game/scoreSystem");
const { startRound } = require("../game/gameManager");

module.exports = async (interaction) => {
  const isButton = interaction.isButton();
  const isModal = interaction.isModalSubmit();

  // Ajustado para o estado global de servidor único
  const state = getGameState();

  // 1. Botão de Correção
  if (isButton && interaction.customId === EDIT_BUTTON_ID) {
    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    )
      return interaction.reply({ content: "Apenas Staff.", ephemeral: true });

    const modal = new ModalBuilder()
      .setCustomId(INVALIDATE_MODAL_ID)
      .setTitle("Corrigir Resposta");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(PLAYER_INPUT_ID)
          .setLabel("ID/Menção")
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(CATEGORY_INPUT_ID)
          .setLabel("Categoria (ou TODOS)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
    );
    await interaction.showModal(modal);
    return true;
  }

  // 2. Modal de Correção
  if (isModal && interaction.customId === INVALIDATE_MODAL_ID) {
    await interaction.deferReply({ ephemeral: true });
    const playerIdentifier = interaction.fields
      .getTextInputValue(PLAYER_INPUT_ID)
      .trim();
    const categoryName = interaction.fields
      .getTextInputValue(CATEGORY_INPUT_ID)
      .trim()
      .toUpperCase();

    let playerID = playerIdentifier.match(/^<@!?(\d+)>$/)?.[1];
    if (!playerID && !isNaN(playerIdentifier) && playerIdentifier.length > 15)
      playerID = playerIdentifier;

    const EMOJI_ERROR = process.env.EMOJI_ERROR || "<:Nao:1443642030637977743>";

    if (!playerID || !state.players[playerID])
      return interaction.followUp({
        content: `${EMOJI_ERROR} Jogador não encontrado na rodada.`,
        ephemeral: true,
      });

    const playerState = state.players[playerID];
    const categoryIndex = state.categories
      .map((c) => c.toUpperCase())
      .indexOf(categoryName);

    if (categoryName === "TODOS") {
      playerState.answers = playerState.answers.map(() => "");
    } else if (categoryIndex !== -1) {
      playerState.answers[categoryIndex] = "";
    } else {
      return interaction.followUp({
        content: `${EMOJI_ERROR} Categoria inválida.`,
        ephemeral: true,
      });
    }

    await postReviewEmbed(state, interaction.channel);
    const EMOJI_SUCCESS =
      process.env.EMOJI_SUCCESS || "<:certo_froid:1443643346722754692>";
    await interaction.followUp({
      content: `${EMOJI_SUCCESS} Atualizado.`,
      ephemeral: true,
    });
    return true;
  }

  // 3. Finalizar
  if (isButton && interaction.customId === FINALIZE_BUTTON_ID) {
    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    )
      return interaction.reply({ content: "Apenas Staff.", ephemeral: true });

    await interaction.deferUpdate();
    const EMOJI_SUCCESS =
      process.env.EMOJI_SUCCESS || "<:certo_froid:1443643346722754692>";
    await interaction.editReply({
      content: `${EMOJI_SUCCESS} Finalizado por ${interaction.user.tag}.`,
      components: [],
    });

    await calculateScores(state, interaction.channel);
    await startRound(interaction.message, state);
    return true;
  }

  return false;
};
