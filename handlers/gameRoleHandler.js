// handlers/gameRoleHandler.js
const { EmbedBuilder } = require("discord.js");

module.exports = async (interaction) => {
  // Agora escutamos menus de seleção, e não mais botões!
  if (!interaction.isStringSelectMenu()) return false;

  const { customId } = interaction;

  // Verifica se a interação pertence a este painel específico
  if (customId !== "select_game_roles") return false;

  await interaction.deferReply({ ephemeral: true });

  // Mapeamento exato dos "values" que colocamos no comando para as chaves do .env
  const roleMap = {
    role_ff: process.env.ROLE_FF,
    role_val: process.env.ROLE_VAL,
    role_cs: process.env.ROLE_CS,
    role_roblox: process.env.ROLE_ROBLOX,
    role_gta: process.env.ROLE_GTA,
    role_mine: process.env.ROLE_MINE,
    role_codenames: process.env.ROLE_CODENAMES,
    role_amongus: process.env.ROLE_AMONGUS,
    role_lol: process.env.ROLE_LOL,
    role_plato: process.env.ROLE_PLATO,
    role_gartic: process.env.ROLE_GARTIC,
    role_bloodstrike: process.env.ROLE_BLOODSTRIKE,
    role_clash: process.env.ROLE_CLASH,
    role_standoff: process.env.ROLE_STANDOFF,
    role_stumble: process.env.ROLE_STUMBLE,
    role_fortnite: process.env.ROLE_FORTNITE,
  };

  // --- Lendo cores e banner do .env ---
  const COLOR_BASE = process.env.COLOR_BASE
    ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
    : 0x00e5ff;
  const COLOR_ERROR = process.env.COLOR_ERROR
    ? parseInt(process.env.COLOR_ERROR.replace("#", ""), 16)
    : 0xff0000;
  const BANNER_URL = process.env.BANNER_URL || "";

  const createResponse = (desc, color = COLOR_BASE) => {
    const embed = new EmbedBuilder()
      .setDescription(desc)
      .setColor(color)
      .setTimestamp();

    if (BANNER_URL) embed.setImage(BANNER_URL);
    return embed;
  };

  try {
    // 1. Pegar TODOS os cargos que esse painel gerencia
    const allManagedRoles = Object.values(roleMap).filter((id) => id);

    // 2. Pegar os cargos que o usuário acabou de selecionar no menu
    const selectedRoles = interaction.values
      .map((val) => roleMap[val])
      .filter((id) => id);

    // 3. Pegar os cargos que o membro já possui atualmente
    const memberRoles = interaction.member.roles;

    // 4. Lógica de Diferença (Delta): O que adicionar e o que remover
    // Adiciona os que ele selecionou mas ainda não tem
    const rolesToAdd = selectedRoles.filter((id) => !memberRoles.cache.has(id));

    // Remove os que ele já tinha, mas não selecionou no menu
    const rolesToRemove = allManagedRoles.filter(
      (id) => memberRoles.cache.has(id) && !selectedRoles.includes(id),
    );

    // 5. Executar as adições e remoções (em lote)
    if (rolesToAdd.length > 0) await memberRoles.add(rolesToAdd);
    if (rolesToRemove.length > 0) await memberRoles.remove(rolesToRemove);

    // 6. Montar o resumo bonito para mostrar pro usuário
    let replyText =
      "🎮 **Suas tags de jogos foram atualizadas com sucesso!**\n\n";

    if (rolesToAdd.length === 0 && rolesToRemove.length === 0) {
      replyText += "Nenhuma alteração foi feita.";
    } else {
      if (rolesToAdd.length > 0) {
        replyText += `➕ **Adicionados:** <@&${rolesToAdd.join("> <@&")}>\n`;
      }
      if (rolesToRemove.length > 0) {
        replyText += `➖ **Removidos:** <@&${rolesToRemove.join("> <@&")}>`;
      }
    }

    await interaction.editReply({ embeds: [createResponse(replyText)] });
    return true; // Retorna true para sinalizar pro roteador (interactionCreate) que foi processado
  } catch (error) {
    console.error("[AUTO-ROLE ERROR]:", error);
    await interaction.editReply({
      embeds: [
        createResponse(
          "❌ **Erro de Permissão:** O cargo do bot (MC KEVIN) precisa estar no topo da hierarquia, acima de todos os cargos de jogos nas configurações do servidor.",
          COLOR_ERROR,
        ),
      ],
    });
    return true;
  }
};
