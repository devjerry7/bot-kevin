// handlers/gameRoleHandler.js
const { EmbedBuilder } = require("discord.js");

module.exports = async (interaction) => {
  // Agora escutamos menus de seleção, e não mais botões!
  if (!interaction.isStringSelectMenu()) return false;

  const { customId } = interaction;

  // Verifica se a interação pertence a este painel específico
  if (customId !== "select_game_roles") return false;

  await interaction.deferReply({ ephemeral: true });

  // Mapeamento aceitando chaves longas e resumidas
  const roleMap = {
    role_ff: process.env.ROLE_FF,
    ff: process.env.ROLE_FF,
    role_val: process.env.ROLE_VAL,
    val: process.env.ROLE_VAL,
    valorant: process.env.ROLE_VAL,
    role_cs: process.env.ROLE_CS,
    cs: process.env.ROLE_CS,
    csgo: process.env.ROLE_CS,
    role_roblox: process.env.ROLE_ROBLOX,
    roblox: process.env.ROLE_ROBLOX,
    role_gta: process.env.ROLE_GTA,
    gta: process.env.ROLE_GTA,
    role_mine: process.env.ROLE_MINE,
    mine: process.env.ROLE_MINE,
    minecraft: process.env.ROLE_MINE,
    role_codenames: process.env.ROLE_CODENAMES,
    codenames: process.env.ROLE_CODENAMES,
    role_amongus: process.env.ROLE_AMONGUS,
    amongus: process.env.ROLE_AMONGUS,
    role_lol: process.env.ROLE_LOL,
    lol: process.env.ROLE_LOL,
    role_plato: process.env.ROLE_PLATO,
    plato: process.env.ROLE_PLATO,
    role_gartic: process.env.ROLE_GARTIC,
    gartic: process.env.ROLE_GARTIC,
    role_bloodstrike: process.env.ROLE_BLOODSTRIKE,
    bloodstrike: process.env.ROLE_BLOODSTRIKE,
    role_clash: process.env.ROLE_CLASH,
    clash: process.env.ROLE_CLASH,
    role_standoff: process.env.ROLE_STANDOFF,
    standoff: process.env.ROLE_STANDOFF,
    role_stumble: process.env.ROLE_STUMBLE,
    stumble: process.env.ROLE_STUMBLE,
    role_fortnite: process.env.ROLE_FORTNITE,
    fortnite: process.env.ROLE_FORTNITE,
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
    // 1. Pegar TODOS os IDs válidos configurados no mapa
    const allManagedRoles = [
      ...new Set(Object.values(roleMap).filter((id) => id && id.trim() !== "")),
    ];

    console.log(
      "[LOG GAME-ROLES] Valualores recebidos da seleção:",
      interaction.values,
    );

    // 2. Resolver os IDs selecionados (se o valor já for um ID direto de snowflake com 17-20 dígitos, usa ele direto)
    const selectedRoles = [
      ...new Set(
        interaction.values
          .map((val) => (/^\d{17,20}$/.test(val) ? val : roleMap[val]))
          .filter((id) => id && id.trim() !== ""),
      ),
    ];

    console.log(
      "[LOG GAME-ROLES] IDs resolvidos para aplicação:",
      selectedRoles,
    );

    // 3. Pegar os cargos do membro
    const memberRoles = interaction.member.roles;

    // 4. Lógica de Diferença (Delta): O que adicionar e o que remover
    const rolesToAdd = selectedRoles.filter((id) => !memberRoles.cache.has(id));

    const rolesToRemove = allManagedRoles.filter(
      (id) => memberRoles.cache.has(id) && !selectedRoles.includes(id),
    );

    // 5. Executar as adições e remoções
    if (rolesToAdd.length > 0) await memberRoles.add(rolesToAdd);
    if (rolesToRemove.length > 0) await memberRoles.remove(rolesToRemove);

    // 6. Resumo do feedback
    let replyText =
      "🎮 **Suas tags de jogos foram atualizadas com sucesso!**\n\n";

    if (rolesToAdd.length === 0 && rolesToRemove.length === 0) {
      if (selectedRoles.length === 0) {
        replyText =
          "⚠️ **Nenhum cargo configurado:** Os IDs dos cargos selecionados não foram encontrados nas variáveis do `.env`. Verifique as configurações.";
      } else {
        replyText +=
          "Nenhuma alteração foi feita (você já possui exatamente estas tags).";
      }
    } else {
      if (rolesToAdd.length > 0) {
        replyText += `➕ **Adicionados:** <@&${rolesToAdd.join("> <@&")}>\n`;
      }
      if (rolesToRemove.length > 0) {
        replyText += `➖ **Removidos:** <@&${rolesToRemove.join("> <@&")}>`;
      }
    }

    await interaction.editReply({ embeds: [createResponse(replyText)] });
    return true;
  } catch (error) {
    console.error("[AUTO-ROLE ERROR]:", error);
    await interaction.editReply({
      embeds: [
        createResponse(
          "❌ **Erro de Permissão:** O cargo do bot precisa estar no topo da hierarquia (acima dos cargos de jogos) ou os IDs informados são inválidos.",
          COLOR_ERROR,
        ),
      ],
    });
    return true;
  }
};
