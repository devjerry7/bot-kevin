// handlers/gameRoleHandler.js
const { EmbedBuilder } = require("discord.js");

module.exports = async (interaction) => {
  if (!interaction.isButton()) return false;

  const { customId } = interaction;

  // Lista completa de todos os botões de cargos de jogos sincronizada com o .env
  const gameButtons = [
    "btn_role_ff",
    "btn_role_val",
    "btn_role_cs",
    "btn_role_gta",
    "btn_role_roblox",
    "btn_role_mine",
    "btn_role_codenames",
    "btn_role_amongus",
    "btn_role_lol",
    "btn_role_plato",
    "btn_role_gartic",
    "btn_role_bloodstrike",
    "btn_role_clash",
    "btn_role_standoff",
    "btn_role_stumble",
    "btn_role_fortnite",
  ];

  if (!gameButtons.includes(customId)) return false;

  await interaction.deferReply({ ephemeral: true });

  // Mapeamento puxando rigorosamente todas as chaves do .env
  const roleMap = {
    btn_role_ff: process.env.ROLE_FF,
    btn_role_val: process.env.ROLE_VAL,
    btn_role_cs: process.env.ROLE_CS,
    btn_role_roblox: process.env.ROLE_ROBLOX,
    btn_role_gta: process.env.ROLE_GTA,
    btn_role_mine: process.env.ROLE_MINE,
    btn_role_codenames: process.env.ROLE_CODENAMES,
    btn_role_amongus: process.env.ROLE_AMONGUS,
    btn_role_lol: process.env.ROLE_LOL,
    btn_role_plato: process.env.ROLE_PLATO,
    btn_role_gartic: process.env.ROLE_GARTIC,
    btn_role_bloodstrike: process.env.ROLE_BLOODSTRIKE,
    btn_role_clash: process.env.ROLE_CLASH,
    btn_role_standoff: process.env.ROLE_STANDOFF,
    btn_role_stumble: process.env.ROLE_STUMBLE,
    btn_role_fortnite: process.env.ROLE_FORTNITE,
  };

  const roleId = roleMap[customId];

  // --- Lendo cores e banner do .env ---
  const COLOR_DIAMOND = process.env.COLOR_DIAMOND
    ? parseInt(process.env.COLOR_DIAMOND.replace("#", ""), 16)
    : 0x00e5ff;
  const COLOR_WARNING = process.env.COLOR_WARNING
    ? parseInt(process.env.COLOR_WARNING.replace("#", ""), 16)
    : 0xffa500;
  const COLOR_ERROR = process.env.COLOR_ERROR
    ? parseInt(process.env.COLOR_ERROR.replace("#", ""), 16)
    : 0xff0000;
  const BANNER_URL = process.env.BANNER_URL || "";

  const createResponse = (desc, color = COLOR_DIAMOND) => {
    const embed = new EmbedBuilder()
      .setDescription(desc)
      .setColor(color)
      .setTimestamp();

    if (BANNER_URL) embed.setImage(BANNER_URL);
    return embed;
  };

  if (!roleId) {
    return interaction.editReply({
      embeds: [
        createResponse(
          "⚠️ Erro: O ID deste cargo não foi configurado corretamente no .env.",
          COLOR_WARNING,
        ),
      ],
    });
  }

  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) {
    return interaction.editReply({
      embeds: [
        createResponse(
          "❌ Erro: O cargo não existe mais no servidor.",
          COLOR_ERROR,
        ),
      ],
    });
  }

  const hasRole = interaction.member.roles.cache.has(roleId);

  try {
    if (hasRole) {
      await interaction.member.roles.remove(roleId);
      interaction.editReply({
        embeds: [
          createResponse(`➖ Cargo **${role.name}** removido com sucesso.`),
        ],
      });
    } else {
      await interaction.member.roles.add(roleId);
      interaction.editReply({
        embeds: [
          createResponse(`➕ Cargo **${role.name}** adicionado ao seu perfil!`),
        ],
      });
    }
  } catch (error) {
    console.error("[AUTO-ROLE ERROR]:", error);
    interaction.editReply({
      embeds: [
        createResponse(
          "❌ Erro de Permissão. O meu cargo de Bot precisa estar acima dos cargos de jogos na lista de configurações do servidor.",
          COLOR_ERROR,
        ),
      ],
    });
  }

  return true;
};
