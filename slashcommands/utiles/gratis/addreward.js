const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");

const OP_ROLE_NAME = "OP";
const SHOP_FILE = "./data/shop.json";
const DATA_DIR = "./data";

function loadShop() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(SHOP_FILE)) fs.writeFileSync(SHOP_FILE, JSON.stringify([]));
    return JSON.parse(fs.readFileSync(SHOP_FILE));
}

function saveShop(data) {
    fs.writeFileSync(SHOP_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("addreward")
        .setDescription("Añade un premio a la tienda. Solo para OP.")
        .addStringOption(opt =>
            opt.setName("nombre").setDescription("Nombre del premio.").setRequired(true)
        )
        .addIntegerOption(opt =>
            opt.setName("precio").setDescription("Precio en ValtherisCoins.").setRequired(true)
        )
        .addRoleOption(opt =>
            opt.setName("rol").setDescription("Rol que se asigna automáticamente al reclamar (opcional).").setRequired(false)
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

        const nombre = interaction.options.getString("nombre");
        const precio = interaction.options.getInteger("precio");
        const rol = interaction.options.getRole("rol");
        const shop = loadShop();

        const newId = shop.length > 0 ? Math.max(...shop.map(i => i.id)) + 1 : 1;
        shop.push({
            id: newId,
            nombre,
            precio,
            rolId: rol ? rol.id : null,
            rolNombre: rol ? rol.name : null
        });
        saveShop(shop);

        const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("✅ Premio Añadido")
            .addFields(
                { name: "🆔 ID", value: `${newId}`, inline: true },
                { name: "🎁 Premio", value: nombre, inline: true },
                { name: "💰 Precio", value: `${precio} ValtherisCoins`, inline: true },
                { name: "🎭 Rol al reclamar", value: rol ? `${rol}` : "Ninguno", inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
