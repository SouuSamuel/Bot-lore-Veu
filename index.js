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

// Mapa de canais disponíveis
const CANAIS = {
  lore:   process.env.CANAL_LORE,
  avisos: process.env.CANAL_AVISOS,
};

// Registrar o comando slash
const commands = [
  new SlashCommandBuilder()
    .setName('anunciar')
    .setDescription('Anuncia uma mensagem em um canal do servidor')
    .addStringOption(opt =>
      opt.setName('canal')
        .setDescription('Onde postar o anúncio')
        .setRequired(true)
        .addChoices(
          { name: '📜 Lore', value: 'lore' },
          { name: '📢 Avisos', value: 'avisos' },
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

client.once('ready', () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'anunciar') return;

  // Só admins podem usar
  if (!interaction.member.permissions.has('Administrator')) {
    return interaction.reply({
      content: '❌ Apenas administradores podem usar este comando.',
      ephemeral: true
    });
  }

  const destino  = interaction.options.getString('canal');
  const mensagem = interaction.options.getString('mensagem');
  const titulo   = interaction.options.getString('titulo');

  // Título padrão por canal
  const tituloPadrao = destino === 'lore' ? '📜 Crônicas do Reino' : '📢 Aviso Oficial';

  const canalId = CANAIS[destino];
  const canal   = client.channels.cache.get(canalId);

  if (!canal) {
    return interaction.reply({
      content: '❌ Canal não encontrado. Verifique as variáveis de ambiente.',
      ephemeral: true
    });
  }

  // Cor diferente por canal
  const cor = destino === 'lore' ? 0xD4AF37 : 0xE74C3C;

  const embed = new EmbedBuilder()
    .setTitle(titulo || tituloPadrao)
    .setDescription(mensagem)
    .setColor(cor)
    .setTimestamp()
    .setFooter({ text: 'Crônicas Oficiais do Servidor' });

  await canal.send({ embeds: [embed] });

  await interaction.reply({
    content: `✅ Anúncio enviado em <#${canalId}>!`,
    ephemeral: true
  });
});

client.login(process.env.DISCORD_TOKEN);