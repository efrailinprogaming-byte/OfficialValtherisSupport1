const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const BATTLE_FILE = "./data/battle.json";
const POINTS_FILE = "./data/points.json";

function loadBattle() {
    if (!fs.existsSync(BATTLE_FILE)) return { active: false };
    return JSON.parse(fs.readFileSync(BATTLE_FILE));
}

function saveBattle(data) {
    fs.writeFileSync(BATTLE_FILE, JSON.stringify(data, null, 2));
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
        .setName("hack")
        .setDescription("Intenta resolver el puzzle activo.")
        .addStringOption(opt =>
            opt.setName("respuesta").setDescription("Tu respuesta al puzzle.").setRequired(true)
        ),

    async execute(interaction) {
        const battle = loadBattle();

        if (!battle.active) {
            return interaction.reply({
                content: "❌ No hay ninguna batalla activa en este momento.",
                ephemeral: true
            });
        }

        const respuesta = interaction.options.getString("respuesta").toLowerCase().trim();
        const userId = interaction.user.id;

        if (respuesta === battle.respuesta) {
            // Correcto — dar puntos
            const points = loadPoints();
            if (!points[userId]) points[userId] = 0;
            points[userId] += battle.puntos;
            savePoints(points);

            // Cerrar batalla
            saveBattle({ active: false });

            const embed = new EmbedBuilder()
                .setColor(0x57f287)
                .setTitle("🔓 ¡GANADOR!")
                .addFields(
                    { name: "👤 Usuario", value: `${interaction.user}` },
                    { name: "✅ Respuesta", value: battle.respuesta },
                    { name: "💰 Ganancia", value: `+**${battle.puntos} ValtherisCoins**` },
                    { name: "📊 Total acumulado", value: `${points[userId]} ValtherisCoins` }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } else {
            // Incorrecto
            const embed = new EmbedBuilder()
                .setColor(0xed4245)
                .setTitle("❌ Intento Fallido")
                .setDescription(`${interaction.user}, respuesta incorrecta. Premio denegado.`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    }
};
