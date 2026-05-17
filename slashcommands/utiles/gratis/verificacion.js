const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");

const OP_ROLE_NAME = "OP";
const CONFIG_FILE = "./data/verificacion.json";
const DATA_DIR = "./data";

function loadConfig() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(CONFIG_FILE)) {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ rolId: null, rolNombre: null }));
    }
    return JSON.parse(fs.readFileSync(CONFIG_FILE));
}

function saveConfig(data) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("verificacion")
        .setDescription("Sistema de verificación.")
        .addSubcommand(sub => sub
            .setName("setup")
            .setDescription("Envía el panel de verificación en este canal.")
            .addRoleOption(opt =>
                opt.setName("rol").setDescription("Rol que se asigna al verificarse.").setRequired(true)
            )
            .addStringOption(opt =>
                opt.setName("mensaje").setDescription("Mensaje personalizado del panel (opcional).").setRequired(false)
            )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    async execute(interaction) {
        const executor = interaction.member;
        const guild = interaction.guild;

        const opRole = guild.roles.cache.find(r => r.name === OP_ROLE_NAME);
        const isAdmin = executor.permissions.has(PermissionFlagsBits.Administrator);
        const isOP = opRole && executor.roles.cache.has(opRole.id);

        if (!isAdmin && !isOP) {
            return interaction.reply({
                content: `❌ No tienes permiso. Necesitas el rango **${OP_ROLE_NAME}** o ser Administrador.`,
                ephemeral: true
            });
        }

        const rol = interaction.options.getRole("rol");
        const mensajeCustom = interaction.options.getString("mensaje") || `Haz clic en el botón de abajo para verificarte y acceder al servidor.`;

        // Guardar config
        saveConfig({ rolId: rol.id, rolNombre: rol.name });

        const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("✅ Verificación")
            .setDescription(mensajeCustom)
            .addFields(
                { name: "📋 Instrucciones", value: "1. Haz clic en el botón **Verificarme**\n2. Recibirás el rol automáticamente\n3. ¡Ya puedes acceder al servidor!" }
            )
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setFooter({ text: guild.name })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("verificar_btn")
                .setLabel("✅ Verificarme")
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ content: "✅ Panel de verificación enviado.", ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    },

    // Llama esto desde index.js en el evento interactionCreate
    async handleButton(interaction) {
        if (interaction.customId !== "verificar_btn") return false;

        const config = loadConfig();

        if (!config.rolId) {
            return interaction.reply({ content: "❌ No hay un rol de verificación configurado.", ephemeral: true });
        }

        const rol = interaction.guild.roles.cache.get(config.rolId);

        if (!rol) {
            return interaction.reply({ content: "❌ El rol de verificación ya no existe. Contacta a un admin.", ephemeral: true });
        }

        if (interaction.member.roles.cache.has(rol.id)) {
            return interaction.reply({ content: "✅ Ya estás verificado.", ephemeral: true });
        }

        try {
            await interaction.member.roles.add(rol, "Verificado mediante el panel.");
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle("✅ ¡Verificado!")
                    .setDescription(`¡Bienvenido a **${interaction.guild.name}**! Se te ha asignado el rol **${rol.name}**.`)
                    .setTimestamp()
                ],
                ephemeral: true
            });
        } catch {
            return interaction.reply({ content: "❌ No pude asignarte el rol. Contacta a un admin.", ephemeral: true });
        }
    }
};