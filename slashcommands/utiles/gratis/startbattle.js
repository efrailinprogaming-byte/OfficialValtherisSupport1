const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");

const OP_ROLE_NAME = "OP";
const BATTLE_FILE = "./data/battle.json";
const DATA_DIR = "./data";

function loadBattle() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(BATTLE_FILE)) fs.writeFileSync(BATTLE_FILE, JSON.stringify({ active: false }));
    return JSON.parse(fs.readFileSync(BATTLE_FILE));
}

function saveBattle(data) {
    fs.writeFileSync(BATTLE_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("startbattle")
        .setDescription("Inicia un puzzle de ValtherisCoins. Solo para OP.")
        .addIntegerOption(opt =>
            opt.setName("puntos").setDescription("Puntos que gana quien responda correctamente.").setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("puzzle").setDescription("La pregunta o puzzle a resolver.").setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("respuesta").setDescription("La respuesta correcta (no se muestra).").setRequired(true)
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

        const battle = loadBattle();

        if (battle.active) {
            return interaction.reply({
                content: "⚠️ Ya hay una batalla activa. Espera a que alguien la resuelva.",
                ephemeral: true
            });
        }

        const puntos = interaction.options.getInteger("puntos");
        const puzzle = interaction.options.getString("puzzle");
        const respuesta = interaction.options.getString("respuesta").toLowerCase().trim();

        saveBattle({ active: true, puntos, puzzle, respuesta, startedBy: executor.user.tag });

        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("⚔️ ¡Nueva Batalla Comenzada!")
            .addFields(
                { name: "🧩 Puzzle", value: puzzle },
                { name: "🏆 Premio", value: `**${puntos} ValtherisCoins**` },
                { name: "📌 ¿Cómo participar?", value: "Usa `/hack` con tu respuesta para intentar ganar." }
            )
            .setFooter({ text: `Iniciado por ${executor.user.tag}` })
            .setTimestamp();

        // Respuesta privada al OP
        await interaction.reply({ content: "✅ Batalla iniciada.", ephemeral: true });

        // Mensaje público con mención al canal
        await interaction.channel.send({
            content: '⚔️ **¡Nueva batalla disponible!**',
            embeds: [embed],
            
        });
    }
};
