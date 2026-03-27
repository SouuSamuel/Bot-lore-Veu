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
        .setDescription('Título do anúncio (opcional)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('imagem')
        .setDescription('URL da imagem (opcional, só para Lore)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('link')
        .setDescription('Link do YouTube ou outro (opcional, aparece com prévia)')
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

    const tituloPadrao = {
      lore:   '📜 Crônicas do Reino',
      avisos: '📢 Aviso Oficial',
      server: '⚔️ Notícia do Servidor',
    }[destino];

    const cor = {
      lore:   0xD4AF37,
      avisos: 0xE74C3C,
      server: 0x5865F2,
    }[destino];

    const canalId = CANAIS[destino];
    const canal   = client.channels.cache.get(canalId);

    if (!canal) {
      return interaction.editReply({
        content: '❌ Canal não encontrado. Verifique as variáveis de ambiente.'
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(titulo || tituloPadrao)
      .setDescription(mensagem)
      .setColor(cor)
      .setTimestamp()
      .setFooter({ text: '✦ Crônicas Oficiais do Servidor ✦' });

    if (destino === 'lore' && imagem) {
      embed.setImage(imagem);
    }

    // Envia tudo em uma mensagem só — link gera prévia automaticamente
    await canal.send({
      content: link ? `@everyone\n${link}` : '@everyone',
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