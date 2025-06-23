const { Client, GatewayIntentBits, Partials, PermissionsBitField, SlashCommandBuilder, REST, Routes } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember]
});

const roles = {
  "exclusive-access": "1309964451025391646",
  "full-access": "1309964453403557920",
  "half-access": "1309964460177363005"
};

const shirtIDs = {
  "exclusive-access": "135228117983216",
  "full-access": "93281202894558",
  "half-access": "90784589610250"
};

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  registerCommands();
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.commandName;
  const robloxUser = interaction.options.getString('roblox_user');
  const userId = await getRobloxId(robloxUser);

  if (!userId) {
    return interaction.reply({ content: '❌ Roblox user not found.', ephemeral: true });
  }

  const shirtId = shirtIDs[command];
  const ownsShirt = await checkOwnership(userId, shirtId);

  if (!ownsShirt) {
    return interaction.reply({ content: '❌ You do not own the required shirt.', ephemeral: true });
  }

  const roleId = roles[command];
  const member = await interaction.guild.members.fetch(interaction.user.id);
  await member.roles.add(roleId);

  interaction.reply({ content: `✅ Role <@&${roleId}> has been added to you.`, ephemeral: true });
});

async function getRobloxId(username) {
  try {
    const res = await axios.post(`https://users.roblox.com/v1/usernames/users`, {
      usernames: [username],
      excludeBannedUsers: true
    });
    return res.data.data[0]?.id;
  } catch {
    return null;
  }
}

async function checkOwnership(userId, shirtId) {
  try {
    const res = await axios.get(`https://inventory.roblox.com/v1/users/${userId}/items/Asset/${shirtId}`);
    return res.data && res.data.length > 0;
  } catch {
    return false;
  }
}

async function registerCommands() {
  const commands = Object.keys(roles).map(key =>
    new SlashCommandBuilder()
      .setName(key)
      .setDescription(`Verify ownership for ${key.replace('-', ' ')} shirt`)
      .addStringOption(option =>
        option.setName('roblox_user')
          .setDescription('Your Roblox username')
          .setRequired(true))
      .toJSON()
  );

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered.');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
}

client.login(process.env.DISCORD_TOKEN);
