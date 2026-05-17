const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];
const foldersPath = path.join(__dirname, 'slashcommands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const folderPath = path.join(foldersPath, folder);
    
    // Solo intentamos leer si es realmente una CARPETA
    if (fs.lstatSync(folderPath).isDirectory()) {
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            }
        }
    }
}

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`Cargando ${commands.length} comandos...`);
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log(`✅ ¡Éxito! Se registraron ${data.length} comandos en Discord.`);
    } catch (error) {
        console.error(error);
    }
})();