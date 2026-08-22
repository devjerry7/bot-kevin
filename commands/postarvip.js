const { EmbedBuilder } = require("discord.js");

const handlePostVip = async (message) => {
  // 🎨 Cor Azul Diamond
  const COLOR_DIAMOND = 0x00e5ff;

  // 🖼️ URL do Banner (Substitua pelo link da imagem gerada pelo Midjourney/IA)
  const BANNER_URL =
    "https://cdn.discordapp.com/attachments/816922172760522772/1537963016098680883/banner-vips.png?ex=6a80f32d&is=6a7fa1ad&hm=5f890963658a1491f2d8f3a7f95dbbf52742d77b7208bcf6b480d7515c5f71be&";

  // 👤 IDs dos Donos (Substitua pelos IDs reais para a galera clicar e chamar na DM)
  const DONO_1 = "578307859964624928";
  const DONO_2 = "697947696702554223";

  const embed = new EmbedBuilder()
    .setTitle("💎 Vantagens Apoiadores")
    .setDescription(
      "Confira abaixo as vantagens de cada Tier no nosso servidor e escolha o seu!\n\n" +
        `<:carrinho:1537973767182098512> **COMO COMPRAR:**\nPara adquirir o seu VIP, entre em contato <@${DONO_1}> ou <@${DONO_2}>`,
    )
    .setColor(COLOR_DIAMOND)
    .setImage(BANNER_URL) // Adiciona o banner gerado
    .addFields(
      {
        name: "<:pureza_h:1536051972946403360> SERVERBOOST - (Grátis via Boost)",
        value:
          "・Cargo destacado no servidor\n・ Permissão de enviar imagem\n・ Call Exclusiva",
        inline: false,
      },
      {
        name: "<:Dinheiro:1535775870168469624> VIP PLATINUM - R$14,97",
        value:
          "・Cargo destacado no servidor\n・ Permissão de enviar imagem\n・ Canal Privado exclusivo\n・ Tag Personalizada",
        inline: false,
      },
      {
        name: "<:1286054799808397322:1537956686533501008> VIP LIVE - R$29,97",
        value:
          "・Cargo destacado no servidor\n・ Permissão de enviar imagem\n・ Canal Privado e Tag Personalizada\n・ Acesso liberado ao chat de Divulgação (Lives/Vídeos)\n・ **Moderação Básica:** Permissão para aceitar novos membros, Mute e Mover membros",
        inline: false,
      },
      {
        name: "<:embeddiamante:1536498067912790026> VIP DIMA - R$49,97",
        value:
          "・**Cargo em destaque máximo (Acima de todos os VIPs)**\n・ Permissão de enviar imagem\n・ **Canal Privado posicionado no topo** e Tag Personalizada\n・ Acesso liberado ao chat de Divulgação\n・ **Moderação Avançada:** Aceitar novos membros, Mute, Mover e Adicionar membros à Blacklist ou ao chat de Exposed",
        inline: false,
      },
    )
    .setFooter({
      text: "Ao adquirir um VIP, você ajuda a manter o servidor ativo e com novidades!",
      iconURL: message.guild.iconURL(),
    })
    .setTimestamp();

  // Envia a embed no canal
  await message.channel.send({ embeds: [embed] });

  // Apaga o comando original para manter o chat limpo
  if (message.deletable) await message.delete().catch(() => {});
};

module.exports = { handlePostVip };
