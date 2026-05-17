const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");

const OP_ROLE_NAME = "OP";
const SHOP_FILE = "./data/shop.json";

function loadShop() {
    if (!fs.existsSync(SHOP_FILE)) return [];
    return JSON.parse(fs.readFileSync(SHOP_FILE));
}

function saveShop(data) {
    fs.writeFileSync(SHOP_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("deletereward")
        .setDescription("Elimina un premio de la tienda. Solo para OP.")
        .addIntegerOption(opt =>
            opt.setName("id").setDescription("ID del premio que quieres eliminar.").setRequired(true)
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

        const id = interaction.options.getInteger("id");
        const shop = loadShop();
        const item = shop.find(i => i.id === id);

        if (!item) {
            return interaction.reply({
                content: `❌ No existe ningún premio con ID **${id}**. Usa \`/shop\` para ver los disponibles.`,
                ephemeral: true
            });
        }

        const nuevaShop = shop.filter(i => i.id !== id);
        saveShop(nuevaShop);

        const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("🗑️ Premio Eliminado")
            .addFields(
                { name: "🆔 ID", value: `${item.id}`, inline: true },
                { name: "🎁 Premio", value: item.nombre, inline: true },
                { name: "💰 Precio", value: `${item.precio} ValtherisCoins`, inline: true },
                { name: "🎭 Rol", value: item.rolId ? `<@&${item.rolId}>` : "Ninguno", inline: true }
            )
            .setFooter({ text: `Eliminado por ${executor.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
