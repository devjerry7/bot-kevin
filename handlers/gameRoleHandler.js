// handlers/gameRoleHandler.js
const { EmbedBuilder } = require("discord.js");
const config = require("../config");

module.exports = async (interaction) => {
  // 1. Escuta apenas Select Menus
  if (!interaction.isStringSelectMenu && !interaction.isAnySelectMenu())
    return false;

  const { customId } = interaction;

  // 2. Trava para responder APENAS ao menu de jogos
  if (customId !== "select_game_roles") return false;

  try {
    await interaction.deferReply({ ephemeral: true });

    const rolesConfig = config.gameRoles || {};

    // Mapeamento das opções do menu para os IDs dos cargos no config.js
    const roleMap = {
      role_ff: rolesConfig.ff,
      role_val: rolesConfig.val,
      role_cs: rolesConfig.cs,
      role_gta: rolesConfig.gta,
      role_roblox: rolesConfig.roblox,
      role_mine: rolesConfig.mine,
      role_codenames: rolesConfig.codenames,
      role_amongus: rolesConfig.amongus,
      role_lol: rolesConfig.lol,
      role_plato: rolesConfig.plato,
      role_gartic: rolesConfig.gartic,
      role_bloodstrike: rolesConfig.bloodstrike,
      role_clash: rolesConfig.clash,
      role_standoff: rolesConfig.standoff,
      role_stumble: rolesConfig.stumble,
      role_fortnite: rolesConfig.fortnite,
    };

    const COLOR_BASE = config.colorBase || 0x962dc0;
    const COLOR_ERROR = config.colorError || 0xff0000;
    const BANNER_URL = config.bannerUrl || config.vip?.bannerVip || "";

    const createResponse = (desc, color = COLOR_BASE) => {
      const embed = new EmbedBuilder()
        .setDescription(desc)
        .setColor(color)
        .setTimestamp();

      if (BANNER_URL && BANNER_URL.startsWith("http"))
        embed.setImage(BANNER_URL);
      return embed;
    };

    // Todos os cargos gerenciados por este painel
    const allManagedRoles = [
      ...new Set(Object.values(roleMap).filter((id) => id && id.trim() !== "")),
    ];

    // Cargos que o usuário selecionou no menu atual
    const selectedRoles = [
      ...new Set(
        interaction.values
          .map((val) => roleMap[val])
          .filter((id) => id && id.trim() !== ""),
      ),
    ];

    const memberRoles = interaction.member.roles;

    // Lógica do Delta (Adicionar / Remover)
    const rolesToAdd = selectedRoles.filter((id) => !memberRoles.cache.has(id));
    const rolesToRemove = allManagedRoles.filter(
      (id) => memberRoles.cache.has(id) && !selectedRoles.includes(id),
    );

    // Aplicação das alterações no Discord
    if (rolesToAdd.length > 0) await memberRoles.add(rolesToAdd);
    if (rolesToRemove.length > 0) await memberRoles.remove(rolesToRemove);

    let replyText =
      "🎮 **Suas tags de jogos foram atualizadas com sucesso!**\n\n";

    if (rolesToAdd.length === 0 && rolesToRemove.length === 0) {
      if (selectedRoles.length === 0 && interaction.values.length > 0) {
        replyText =
          "⚠️ **Cargos não encontrados:** Os IDs para as opções selecionadas não estão configurados no `config.js`.";
      } else {
        replyText +=
          "Nenhuma alteração foi feita (suas tags já estão atualizadas).";
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
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              "❌ **Erro de Permissão:** Garanta que o cargo do bot esteja acima dos cargos de jogos na hierarquia do servidor.",
            )
            .setColor(0xff0000),
        ],
      });
    }
    return true;
  }
};
