const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const SHOP_FILE = "./data/shop.json";
const POINTS_FILE = "./data/points.json";

function loadShop() {
    if (!fs.existsSync(SHOP_FILE)) return [];
    return JSON.parse(fs.readFileSync(SHOP_FILE));
}

function loadPoints() {
    if (!fs.existsSync(POINTS_FILE)) fs.writeFileSync(POINTS_FILE, JSON.stringify({}));
    return JSON.parse(fs.readFileSync(POINTS_FILE));
}

function savePoints(data) {
    fs.writeFileSync(POINTS_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("redeem")
        .setDescription("Compra un premio de la tienda usando su ID.")
        .addIntegerOption(opt =>
            opt.setName("id").setDescription("ID del premio que quieres comprar.").setRequired(true)
        ),

    async execute(interaction) {
        const id = interaction.options.getInteger("id");
        const userId = interaction.user.id;
        const guild = interaction.guild;
        const member = interaction.member;
        const shop = loadShop();
        const points = loadPoints();

        const item = shop.find(i => i.id === id);

        if (!item) {
            return interaction.reply({
                content: `❌ No existe ningún premio con ID **${id}**. Usa \`/shop\` para ver los disponibles.`,
                ephemeral: true
            });
        }

        const userPoints = points[userId] || 0;

        if (userPoints < item.precio) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0xed4245)
                    .setTitle("❌ ValtherisCoins Insuficientes")
                    .setDescription(
                        `Necesitas **${item.precio} ValtherisCoins** para canjear **${item.nombre}**.\n` +
                        `Actualmente tienes **${userPoints} ValtherisCoins**.\n` +
                        `Te faltan **${item.precio - userPoints} ValtherisCoins**.`
                    )
                ],
                ephemeral: true
            });
        }

        // Descontar puntos
        points[userId] = userPoints - item.precio;
        savePoints(points);

        // Asignar rol si el item tiene uno configurado
        let rolAsignado = false;
        let rolError = false;

        if (item.rolId) {
            const rol = guild.roles.cache.get(item.rolId);
            if (rol) {
                try {
                    await member.roles.add(rol, `Premio canjeado: ${item.nombre}`);
                    rolAsignado = true;
                } catch {
                    rolError = true;
                }
            }
        }

        // Construir campos del embed
        const fields = [
            { name: "🎁 Premio", value: item.nombre, inline: true },
            { name: "💸 Gastado", value: `${item.precio} ValtherisCoins`, inline: true },
            { name: "💰 Restante", value: `${points[userId]} ValtherisCoins`, inline: true }
        ];

        if (item.rolId) {
            if (rolAsignado) {
                fields.push({ name: "🎭 Rol asignado", value: `<@&${item.rolId}>`, inline: true });
            } else if (rolError) {
                fields.push({ name: "⚠️ Rol", value: "No se pudo asignar el rol automáticamente. Contacta a un admin.", inline: false });
            }
        }

        const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("🎉 ¡Premio Canjeado!")
            .addFields(...fields)
            .setDescription(item.rolId && rolAsignado
                ? "¡Tu rol ha sido asignado automáticamente!"
                : item.rolId
                ? "Un administrador te contactará para entregarte tu premio."
                : "Un administrador te contactará para entregarte tu premio."
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Notificar en canal de logs si existe
        const logsChannel = guild.channels.cache.find(c => c.name === "logs" || c.name === "admin-logs");
        if (logsChannel) {
            logsChannel.send({
                embeds: [new EmbedBuilder()
                    .setColor(0xf1c40f)
                    .setTitle("🛒 Nuevo Canje de Premio")
                    .addFields(
                        { name: "👤 Usuario", value: `${interaction.user} (${interaction.user.tag})` },
                        { name: "🎁 Premio", value: item.nombre },
                        { name: "💰 ValtherisCoins gastados", value: `${item.precio}` },
                        { name: "🎭 Rol asignado", value: item.rolId ? (rolAsignado ? `<@&${item.rolId}>` : "❌ Error al asignar") : "Ninguno" }
                    )
                    .setTimestamp()
                ]
            });
        }
    }
};
