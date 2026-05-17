const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const SHOP_FILE = "./data/shop.json";

function loadShop() {
    if (!fs.existsSync(SHOP_FILE)) fs.writeFileSync(SHOP_FILE, JSON.stringify([]));
    return JSON.parse(fs.readFileSync(SHOP_FILE));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription("Muestra los premios disponibles en la tienda."),

    async execute(interaction) {
        const shop = loadShop();

        if (shop.length === 0) {
            return interaction.reply({
                content: "🛒 La tienda está vacía. Un administrador puede añadir premios con `/addreward`.",
                ephemeral: true
            });
        }

        const lista = shop.map(item =>
            `**ID: ${item.id} | ${item.nombre}**\nPrecio: **${item.precio} ValtherisCoins**`
        ).join("\n\n");

        const embed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle("🛒 Tienda de ValtherisCoins")
            .setDescription(lista)
            .setFooter({ text: "Usa /redeem <ID> para comprar un premio." })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
