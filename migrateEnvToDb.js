// migrateEnvToDb.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
require("dotenv").config();

async function main() {
  const guildId = process.env.GUILD_ID; // Pega o ID do seu servidor do .env

  if (!guildId) {
    console.error("❌ ERRO: GUILD_ID não encontrado no .env");
    return;
  }

  console.log(
    `🔄 Iniciando migração do .env para o Banco de Dados (Servidor: ${guildId})...`
  );

  // Mapeando as variáveis do seu .env para as colunas do Banco
  const configData = {
    // --- STAFF ---
    staffTrustedRoles: process.env.STAFF_TRUSTED_ROLES,
    roleManagerIds: process.env.ROLE_MANAGER_IDS,
    roleAssignerIds: process.env.ROLE_ASSIGNER_IDS,

    // --- VERIFICAÇÃO ---
    verificationChannelId: process.env.VERIFICATION_CHANNEL_ID,
    approvalChannelId: process.env.APPROVAL_CHANNEL_ID,
    approvedLogChannelId: process.env.APPROVED_LOG_CHANNEL_ID,
    verifiedRoleId: process.env.VERIFIED_ROLE_ID,
    approverRoleId: process.env.APPROVER_ROLE_ID,
    secondaryApproverRoleId: process.env.SECONDARY_APPROVER_ROLE_ID,

    // --- VIP ---
    vipRoleId: process.env.VIP_ROLE_ID,
    vipCategoryId: process.env.VIP_CATEGORY_ID,
    vipAnchorRoleId: process.env.VIP_ANCHOR_ROLE_ID,

    // --- MODERAÇÃO ---
    jailRoleId: process.env.JAIL_ROLE_ID,

    // --- REACTION ROLES ---
    roleReactionChannelId: process.env.ROLE_REACTION_CHANNEL_ID,
    roleReactionMessageId: process.env.ROLE_REACTION_MESSAGE_ID,

    // --- LOGS GERAIS ---
    logChannelId: process.env.LOG_CHANNEL_ID,
    memberJoinLeaveLogId: process.env.MEMBER_JOIN_LEAVE_LOG_ID,
    messageEditLogId: process.env.MESSAGE_EDIT_LOG_ID,
    messageDeleteLogId: process.env.MESSAGE_DELETE_LOG_ID,
    modBanLogId: process.env.MOD_BAN_LOG_ID,
    modMuteLogId: process.env.MOD_MUTE_LOG_ID,
    voiceLogId: process.env.VOICE_LOG_ID,
    channelUpdateLogId: process.env.CHANNEL_UPDATE_LOG_ID,

    // --- LOGS ESPECÍFICOS ---
    pdLogChannelId: process.env.PD_LOG_CHANNEL_ID,
    ticketLogId: process.env.TICKET_LOG_ID,
    panelaLogId: process.env.PANELA_LOG_ID,
    blacklistLogId: process.env.BLACKLIST_LOG_ID,

    // --- JOGOS ---
    freefireRoleId: process.env.FREEFIRE_ROLE_ID,
    valorantRoleId: process.env.VALORANT_ROLE_ID,
    csRoleId: process.env.CS_ROLE_ID,
    robloxRoleId: process.env.ROBLOX_ROLE_ID,
    gtaRoleId: process.env.GTA_ROLE_ID,
    minecraftRoleId: process.env.MINECRAFT_ROLE_ID,

    // --- BOOSTER ---
    boosterCategoryId: process.env.BOOSTER_CATEGORY_ID,
    boosterAnchorRoleId: process.env.BOOSTER_ANCHOR_ROLE_ID,

    // --- TICKETS ---
    ticketParentChannelId: process.env.TICKET_PARENT_CHANNEL_ID,
  };

  // Salva ou Atualiza no Banco
  await prisma.guildConfiguration.upsert({
    where: { guildId: guildId },
    update: configData,
    create: {
      guildId: guildId,
      ...configData,
    },
  });

  console.log(
    "✅ SUCESSO! Todas as configurações do .env foram salvas no Banco de Dados."
  );
  console.log("🚀 Agora você pode usar o sistema SaaS sem medo.");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
