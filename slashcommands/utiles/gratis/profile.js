const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const POINTS_FILE = "./data/points.json";

function loadPoints() {
    if (!fs.existsSync(POINTS_FILE)) fs.writeFileSync(POINTS_FILE, JSON.stringify({}));
    return JSON.parse(fs.readFileSync(POINTS_FILE));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Muestra tus ValtherisCoins.")
        .addUserOption(opt =>
            opt.setName("usuario").setDescription("Ver el perfil de otro usuario (opcional).").setRequired(false)
        ),

    async execute(interaction) {
        const target = interaction.options.getMember("usuario") || interaction.member;
        const points = loadPoints();
        const total = points[target.user.id] || 0;

        // Rango según puntos
        let rango;
        if (total >= 5000) rango = "💀 Hacker Legendario";
        else if (total >= 2000) rango = "🔴 Hacker Élite";
        else if (total >= 1000) rango = "🟠 Hacker Avanzado";
        else if (total >= 500) rango = "🟡 Hacker Intermedio";
        else if (total >= 100) rango = "🟢 Hacker Novato";
        else rango = "⚪ Sin rango";

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`🧠 Perfil de ${target.user.username}`)
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: "💰 ValtherisCoins", value: `**${total}**`, inline: true },
                { name: "🏅 Rango", value: rango, inline: true }
            )
            .setFooter({ text: interaction.guild.name })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
