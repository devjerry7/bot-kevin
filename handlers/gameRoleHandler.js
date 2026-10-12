// handlers/gameRoleHandler.js
const { EmbedBuilder } = require("discord.js");
const config = require("../config");

module.exports = async (interaction) => {
  if (!interaction.isStringSelectMenu()) return false;

  const { customId } = interaction;
  if (customId !== "select_game_roles") return false;

  await interaction.deferReply({ ephemeral: true });

  // Mapeamento buscando diretamente do config.js ou process.env
  const rolesConfig = config.gameRoles || {};
  const roleMap = {
    role_ff: rolesConfig.ff || process.env.ROLE_FF,
    ff: rolesConfig.ff || process.env.ROLE_FF,
    role_val: rolesConfig.val || process.env.ROLE_VAL,
    val: rolesConfig.val || process.env.ROLE_VAL,
    valorant: rolesConfig.val || process.env.ROLE_VAL,
    role_cs: rolesConfig.cs || process.env.ROLE_CS,
    cs: rolesConfig.cs || process.env.ROLE_CS,
    csgo: rolesConfig.cs || process.env.ROLE_CS,
    role_roblox: rolesConfig.roblox || process.env.ROLE_ROBLOX,
    roblox: rolesConfig.roblox || process.env.ROLE_ROBLOX,
    role_gta: rolesConfig.gta || process.env.ROLE_GTA,
    gta: rolesConfig.gta || process.env.ROLE_GTA,
    role_mine: rolesConfig.mine || process.env.ROLE_MINE,
    mine: rolesConfig.mine || process.env.ROLE_MINE,
    minecraft: rolesConfig.mine || process.env.ROLE_MINE,
    role_codenames: rolesConfig.codenames || process.env.ROLE_CODENAMES,
    codenames: rolesConfig.codenames || process.env.ROLE_CODENAMES,
    role_amongus: rolesConfig.amongus || process.env.ROLE_AMONGUS,
    amongus: rolesConfig.amongus || process.env.ROLE_AMONGUS,
    role_lol: rolesConfig.lol || process.env.ROLE_LOL,
    lol: rolesConfig.lol || process.env.ROLE_LOL,
    role_plato: rolesConfig.plato || process.env.ROLE_PLATO,
    plato: rolesConfig.plato || process.env.ROLE_PLATO,
    role_gartic: rolesConfig.gartic || process.env.ROLE_GARTIC,
    gartic: rolesConfig.gartic || process.env.ROLE_GARTIC,
    role_bloodstrike: rolesConfig.bloodstrike || process.env.ROLE_BLOODSTRIKE,
    bloodstrike: rolesConfig.bloodstrike || process.env.ROLE_BLOODSTRIKE,
    role_clash: rolesConfig.clash || process.env.ROLE_CLASH,
    clash: rolesConfig.clash || process.env.ROLE_CLASH,
    role_standoff: rolesConfig.standoff || process.env.ROLE_STANDOFF,
    standoff: rolesConfig.standoff || process.env.ROLE_STANDOFF,
    role_stumble: rolesConfig.stumble || process.env.ROLE_STUMBLE,
    stumble: rolesConfig.stumble || process.env.ROLE_STUMBLE,
    role_fortnite: rolesConfig.fortnite || process.env.ROLE_FORTNITE,
    fortnite: rolesConfig.fortnite || process.env.ROLE_FORTNITE,
  };

  const COLOR_BASE = config.colorBase || 0x962dc0;
  const COLOR_ERROR = config.colorError || 0xff0000;
  const BANNER_URL = config.bannerUrl || "";

  const createResponse = (desc, color = COLOR_BASE) => {
    const embed = new EmbedBuilder()
      .setDescription(desc)
      .setColor(color)
      .setTimestamp();

    if (BANNER_URL) embed.setImage(BANNER_URL);
    return embed;
  };

  try {
    const allManagedRoles = [
      ...new Set(Object.values(roleMap).filter((id) => id && id.trim() !== "")),
    ];

    const selectedRoles = [
      ...new Set(
        interaction.values
          .map((val) => (/^\d{17,20}$/.test(val) ? val : roleMap[val]))
          .filter((id) => id && id.trim() !== ""),
      ),
    ];

    const memberRoles = interaction.member.roles;

    const rolesToAdd = selectedRoles.filter((id) => !memberRoles.cache.has(id));
    const rolesToRemove = allManagedRoles.filter(
      (id) => memberRoles.cache.has(id) && !selectedRoles.includes(id),
    );

    if (rolesToAdd.length > 0) await memberRoles.add(rolesToAdd);
    if (rolesToRemove.length > 0) await memberRoles.remove(rolesToRemove);

    let replyText =
      "🎮 **Suas tags de jogos foram atualizadas com sucesso!**\n\n";

    if (rolesToAdd.length === 0 && rolesToRemove.length === 0) {
      replyText +=
        "Nenhuma alteração foi feita (você já possui exatamente estas tags).";
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
          "❌ **Erro de Permissão:** O cargo do bot precisa estar no topo da hierarquia (acima dos cargos de jogos) no Discord.",
          COLOR_ERROR,
        ),
      ],
    });
    return true;
  }
};
