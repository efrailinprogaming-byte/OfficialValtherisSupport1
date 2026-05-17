const { readdirSync } = require("node:fs");

module.exports = {
    async loadSlash(client) {
        const commandsCollection = client.slashcommands;
        console.log("📂 Iniciando carga de comandos...");
        
        const uniqueCommands = new Map();

        try {
            const categories = readdirSync("./slashcommands");

            for (const category of categories) {
                const subPath = `./slashcommands/${category}`;
                const subCategories = readdirSync(subPath);
                
                for (const subCat of subCategories) {
                    const filePath = `./slashcommands/${category}/${subCat}`;
                    const commandFiles = readdirSync(filePath).filter((file) => file.endsWith(".js"));

                    for (const fileName of commandFiles) {
                        try {
                            const pathResolve = `../slashcommands/${category}/${subCat}/${fileName}`;
                            delete require.cache[require.resolve(pathResolve)];
                            const command = require(pathResolve);
                            
                            if (command && command.data) {
                                const cmdName = command.data.name;

                                if (uniqueCommands.has(cmdName)) {
                                    console.warn(`⚠️ Omitiendo duplicado: El nombre "${cmdName}" ya está en uso.`);
                                    continue;
                                }

                                commandsCollection.set(cmdName, command);
                                uniqueCommands.set(cmdName, command.data.toJSON());
                                console.log(`✅ Cargado: ${cmdName}`);
                            }
                        } catch (error) {
                            console.error(`❌ Error en archivo ${fileName}:`, error.message);
                        }
                    }
                }
            }

            const commandsArray = Array.from(uniqueCommands.values());

            if (client.application && commandsArray.length > 0) {
                const guild = client.guilds.cache.get(process.env.GUILD_ID);

                if (guild) {
                    await guild.commands.set(commandsArray);
                    console.log(`🚀 ¡Éxito! ${commandsArray.length} comandos únicos registrados en el servidor.`);
                } else {
                    await client.application.commands.set(commandsArray);
                    console.log(`🚀 ¡Éxito! ${commandsArray.length} comandos únicos registrados globalmente.`);
                }
            }

        } catch (error) {
            console.error("❌ Error general en el cargador:", error);
        }
    },
};