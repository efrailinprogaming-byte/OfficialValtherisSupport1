const { Client, GatewayIntentBits, Collection, MessageFlags } = require("discord.js");
const { loadSlash } = require("./handlers/slashHandler");
const { handleMessage } = require("./slashcommands/utiles/gratis/automod");
const { handleButton } = require("./slashcommands/utiles/gratis/verificacion");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.slashcommands = new Collection();

client.on('interactionCreate', async (interaction) => {
  // Botones
  if (interaction.isButton()) {
    await handleButton(interaction);
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const cmd = client.slashcommands.get(interaction.commandName);
  if (!cmd) return;

  try {
    await cmd.execute(interaction, client);
  } catch (error) {
    console.error(error);
    const errorMsg = {
      content: 'Hubo un error al ejecutar el comando.',
      flags: [MessageFlags.Ephemeral]
    };
    if (interaction.replied || interaction.deferred) await interaction.followUp(errorMsg);
    else await interaction.reply(errorMsg);
  }
});

// AutoMod
client.on("messageCreate", async (message) => {
  await handleMessage(message, client);
});

client.on("ready", async () => {
  await loadSlash(client);
  console.log(`» | Bot encendido: ${client.user.tag}`);
});

client.login(process.env.TOKEN);