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

// Identidade visual por canal
const ESTILO = {
  lore: {
    titulo:    '⚜️ Crônicas do Reino ⚜️',
    cor:       0xD4AF37,  // dourado
    footer:    '✦ Os escribas registraram mais uma história ✦',
    thumbnail: 'https://i.imgur.com/9QMpHQG.png', // pergaminho
  },
  avisos: {
    titulo:    '🔔 Decreto Real 🔔',
    cor:       0xC0392B,  // vermelho sangue
    footer:    '⚔️ Por ordem do Conselho do Véu ⚔️',
    thumbnail: 'https://i.imgur.com/2nCt3Sn.png', // brasão
  },
  server: {
    titulo:    '🏰 Notícias do Reino 🏰',
    cor:       0x2E86AB,  // azul aço
    footer:    '🌑 O Véu observa a todos 🌑',
    thumbnail: 'https://i.imgur.com/7QMpHQG.png', // castelo
  },
};

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
        .setDescription('Conteúdo do anúncio')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('titulo')
        .setDescription('Título personalizado (opcional)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('imagem')
        .setDescription('URL da imagem principal (opcional)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('link')
        .setDescription('Link do YouTube ou outro (opcional)')
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

    // Formata a mensagem com estilo medieval
    const mensagemFormatada = `*${mensagem}*`;

    const embed = new EmbedBuilder()
      .setTitle(titulo || estilo.titulo)
      .setDescription(mensagemFormatada)
      .setColor(estilo.cor)
      .setTimestamp()
      .setFooter({ text: estilo.footer });

    // Imagem principal (grande, embaixo)
    if (imagem) {
      embed.setImage(imagem);
    }

    // Envia @everyone + embed
    await canal.send({
      content: '@everyone',
      embeds: [embed],
      allowedMentions: { parse: ['everyone'] }
    });

    // Link separado para gerar prévia
    if (link) {
      await canal.send({ content: link });
    }

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