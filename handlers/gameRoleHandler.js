// handlers/gameRoleHandler.js
const { EmbedBuilder } = require("discord.js");

// Configuração Visual V2
const HEADER_IMAGE =
  "https://media.discordapp.net/attachments/1539757756272091177/1540170399369662484/14_de_ago._de_2026_18_19_38.png?ex=6a88faf6&is=6a87a976&hm=9e613c70cf8982eb821bb1d6d0e9afb08f48de6a1932c2d51f7a8403effa30d8&=&format=webp&quality=lossless&width=1536&height=615";
const COLOR_DIAMOND = 0x00e5ff;

module.exports = async (interaction) => {
  if (!interaction.isButton()) return false;

  const { customId } = interaction;

  // Lista atualizada com Codenames e Among Us
  const gameButtons = [
    "btn_role_ff",
    "btn_role_val",
    "btn_role_cs",
    "btn_role_gta",
    "btn_role_roblox",
    "btn_role_mine",
    "btn_role_codenames", // NOVO
    "btn_role_amongus", // NOVO
  ];

  if (!gameButtons.includes(customId)) return false;

  await interaction.deferReply({ ephemeral: true });

  // 👇 INSIRA OS IDs DOS CARGOS AQUI 👇
  // Como o bot é para um servidor só, colocamos os IDs diretos!
  const roleMap = {
    btn_role_ff: "1537238139725414460",
    btn_role_val: "1537238427915784312",
    btn_role_cs: "1540161210488590386",
    btn_role_roblox: "1537238242770821170",
    btn_role_gta: "1540161300229914684",
    btn_role_mine: "1540161266138742844",
    btn_role_codenames: "1540161171364126780", // ID do cargo Codenames
    btn_role_amongus: "1540161415652835338", // ID do cargo Among Us
  };

  const roleId = roleMap[customId];

  const createResponse = (desc, color = COLOR_DIAMOND) => {
    return new EmbedBuilder()
      .setDescription(desc)
      .setColor(color)
      .setImage(HEADER_IMAGE)
      .setTimestamp();
  };

  if (!roleId || roleId === "COLOQUE_O_ID_AQUI") {
    return interaction.editReply({
      embeds: [
        createResponse(
          "⚠️ Erro: O ID deste cargo não foi configurado pelo dono no código.",
          0xffa500,
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
          0xff0000,
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
    console.error("Erro Auto-Role:", error);
    interaction.editReply({
      embeds: [
        createResponse(
          "❌ Erro de Permissão. O meu cargo de Bot precisa estar acima dos cargos de jogos na lista de configurações do servidor.",
          0xff0000,
        ),
      ],
    });
  }

  return true;
};
