require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const CANAIS = {
  lore:   process.env.CANAL_LORE,
  avisos: process.env.CANAL_AVISOS,
  server: process.env.CANAL_SERVER,
};

const ESTILO = {
  lore: {
    titulo: '⚜️ Crônicas do Reino ⚜️',
    cor:    0xD4AF37,
    footer: '✦ Os escribas registraram mais uma história ✦',
  },
  avisos: {
    titulo: '🔔 Decreto Real 🔔',
    cor:    0xC0392B,
    footer: '⚔️ Por ordem do Conselho do Véu ⚔️',
  },
  server: {
    titulo: '🏰 Notícias do Reino 🏰',
    cor:    0x2E86AB,
    footer: '🌑 O Véu observa a todos 🌑',
  },
};

// Extrai o ID do vídeo do YouTube automaticamente
function extrairYoutubeId(link) {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = link?.match(regex);
  return match ? match[1] : null;
}

const commands = [
  new SlashCommandBuilder()
    .setName('anunciar')
    .setDescription('Anuncia uma mensagem em um canal do servidor')
    .addStringOption(opt =>
      opt.setName('canal')
        .setDescription('Onde postar o anúncio')
        .setRequired(true)
        .addChoices(
          { name: '📜 Lore',     value: 'lore'   },
          { name: '📢 Avisos',   value: 'avisos'  },
          { name: '⚔️ Servidor', value: 'server'  },
        )
    )
    .addStringOption(opt =>
      opt.setName('mensagem')
        .setDescription('Conteúdo do anúncio — use \\n para quebrar linha')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('titulo')
        .setDescription('Título personalizado (opcional)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('imagem')
        .setDescription('URL de imagem personalizada (opcional)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('link')
        .setDescription('Link do YouTube — vira título clicável com thumbnail automática')
        .setRequired(false)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  console.log('Registrando comandos...');
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log('Comandos registrados!');
})();

client.once('clientReady', () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'anunciar') return;

  try {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.editReply({
        content: '❌ Apenas administradores podem usar este comando.'
      });
    }

    const destino  = interaction.options.getString('canal');
    const mensagem = interaction.options.getString('mensagem');
    const titulo   = interaction.options.getString('titulo');
    const imagem   = interaction.options.getString('imagem');
    const link     = interaction.options.getString('link');

    const estilo  = ESTILO[destino];
    const canalId = CANAIS[destino];
    const canal   = client.channels.cache.get(canalId);

    if (!canal) {
      return interaction.editReply({
        content: '❌ Canal não encontrado. Verifique as variáveis de ambiente.'
      });
    }

    // Converte \n em quebra de linha real
    const mensagemFinal = mensagem.replace(/\\n/g, '\n');

    // Extrai ID do YouTube se tiver link
    const youtubeId = extrairYoutubeId(link);
    const thumbnailYoutube = youtubeId
      ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
      : null;

    const embed = new EmbedBuilder()
      .setTitle(titulo || estilo.titulo)
      .setDescription(`*${mensagemFinal}*`)
      .setColor(estilo.cor)
      .setTimestamp()
      .setFooter({ text: estilo.footer });

    // Se tiver link do YouTube, título vira clicável
    if (link) {
      embed.setURL(link);
    }

    // Prioridade: imagem manual > thumbnail do YouTube
    if (imagem) {
      embed.setImage(imagem);
    } else if (thumbnailYoutube) {
      embed.setImage(thumbnailYoutube);
    }

    await canal.send({
      content: '@everyone',
      embeds: [embed],
      allowedMentions: { parse: ['everyone'] }
    });

    await interaction.editReply({
      content: `✅ Anúncio enviado em <#${canalId}>!`
    });

    setTimeout(async () => {
      await interaction.deleteReply();
    }, 3000);

  } catch (erro) {
    console.error('Erro completo:', erro.message);
    console.error('Stack:', erro.stack);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `❌ Erro: ${erro.message}`,
        ephemeral: true
      });
    } else {
      await interaction.editReply({
        content: `❌ Erro: ${erro.message}`
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);