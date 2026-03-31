require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Estilos disponíveis para o anúncio
const ESTILOS = {
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
    .setDescription('Anuncia uma mensagem em qualquer canal do servidor')
    .addChannelOption(opt =>
      opt.setName('canal')
        .setDescription('Selecione o canal de destino')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    )
    .addStringOption(opt =>
      opt.setName('mensagem')
        .setDescription('Conteúdo do anúncio — use \\n para quebrar linha')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('estilo')
        .setDescription('Estilo visual do embed (padrão: Servidor)')
        .setRequired(false)
        .addChoices(
          { name: '⚜️ Lore',      value: 'lore'   },
          { name: '🔔 Avisos',    value: 'avisos'  },
          { name: '🏰 Servidor',  value: 'server'  },
        )
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

    const canal    = interaction.options.getChannel('canal');
    const mensagem = interaction.options.getString('mensagem');
    const estiloId = interaction.options.getString('estilo') || 'server';
    const titulo   = interaction.options.getString('titulo');
    const imagem   = interaction.options.getString('imagem');
    const link     = interaction.options.getString('link');

    if (!canal) {
      return interaction.editReply({
        content: '❌ Canal não encontrado.'
      });
    }

    const estilo = ESTILOS[estiloId];

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
      content: `✅ Anúncio enviado em <#${canal.id}>!`
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
