// commands/avatar.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");

// Set para gerenciar cooldown (tempo de espera) localmente
const cooldowns = new Set();

const handleAvatar = async (message, args) => {
  try {
    // --- 1. Identifica o usuário alvo (Menção -> ID -> Autor) ---
    let user = message.mentions.users.first();

    if (!user && args[0]) {
      const id = args[0].replace(/<@!?(\d+)>/, "$1");
      user = await message.client.users.fetch(id).catch(() => null);
    }

    user = user || message.author;

    // Busca o membro no servidor para pegar cargos e cores
    const member = await message.guild.members.fetch(user.id).catch(() => null);

    // --- 2. Verificação de Cooldown (Anti-Spam) ---
    const isAdmin = message.member.permissions.has(
      PermissionsBitField.Flags.Administrator,
    );

    if (!isAdmin && cooldowns.has(message.author.id)) {
      const reply = await message.reply({
        content: "⏳ Aguarde um pouco para usar este comando novamente.",
      });
      setTimeout(() => reply.delete().catch(() => {}), 3000);
      return;
    }

    // --- 3. Definição Visual (Cor e Ícone) ---
    // Pega a cor do cargo mais alto ou usa o Azul Diamond da V2
    const avatarColor =
      member?.displayHexColor && member.displayHexColor !== "#000000"
        ? member.displayHexColor
        : "#00E5FF";

    const pngLink = user.displayAvatarURL({ extension: "png", size: 4096 });
    // URL principal (Retorna GIF se for animado, PNG/JPG se não for)
    const displayLink = user.displayAvatarURL({ size: 4096 });

    // --- 4. Criação do Embed ---
    const avatarEmbed = new EmbedBuilder()
      .setAuthor({
        name: `Avatar de ${user.username}`,
        iconURL: displayLink,
      })
      .setDescription(`[⬇️ Clique aqui para baixar a imagem](${pngLink})`)
      .setImage(displayLink)
      .setColor(avatarColor)
      .setFooter({
        text: `Solicitado por ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL(),
      })
      .setTimestamp();

    await message.channel.send({ embeds: [avatarEmbed] });

    // --- 5. Aplica Cooldown para não-admins ---
    if (!isAdmin) {
      cooldowns.add(message.author.id);
      setTimeout(() => cooldowns.delete(message.author.id), 5000);
    }

    return true;
  } catch (error) {
    console.error("[AVATAR ERROR] Erro ao buscar avatar:", error);
    const errorMsg = await message.channel.send({
      content: "❌ Ocorreu um erro ao tentar buscar este avatar.",
    });
    setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
  }
};

module.exports = { handleAvatar };
