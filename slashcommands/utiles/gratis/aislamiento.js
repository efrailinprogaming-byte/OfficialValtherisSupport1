const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

const OP_ROLE_NAME = "OP";

const DURACIONES = {
    "60":    { label: "1 minuto",   ms: 60_000 },
    "300":   { label: "5 minutos",  ms: 300_000 },
    "600":   { label: "10 minutos", ms: 600_000 },
    "1800":  { label: "30 minutos", ms: 1_800_000 },
    "3600":  { label: "1 hora",     ms: 3_600_000 },
    "7200":  { label: "2 horas",    ms: 7_200_000 },
    "86400": { label: "1 día",      ms: 86_400_000 },
};

function hasAccess(member, guild) {
    const opRole = guild.roles.cache.find(r => r.name === OP_ROLE_NAME);
    return opRole && member.roles.cache.has(opRole.id);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("aislamiento")
        .setDescription("Aísla a un usuario por un tiempo determinado.")
        .addUserOption(opt =>
            opt.setName("usuario").setDescription("Usuario a aislar.").setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("duracion")
                .setDescription("Duración del aislamiento.")
                .setRequired(true)
                .addChoices(
                    { name: "1 minuto",   value: "60" },
                    { name: "5 minutos",  value: "300" },
                    { name: "10 minutos", value: "600" },
                    { name: "30 minutos", value: "1800" },
                    { name: "1 hora",     value: "3600" },
                    { name: "2 horas",    value: "7200" },
                    { name: "1 día",      value: "86400" }
                )
        )
        .addStringOption(opt =>
            opt.setName("razon").setDescription("Razón del aislamiento.").setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const executor = interaction.member;
        const guild    = interaction.guild;

        if (!hasAccess(executor, guild)) {
            return interaction.reply({
                content: `❌ No tienes permiso. Necesitas el rango **${OP_ROLE_NAME}** o ser Administrador.`,
                ephemeral: true
            });
        }

        const target = interaction.options.getMember("usuario");
        const durKey = interaction.options.getString("duracion");
        const razon  = interaction.options.getString("razon") ?? "Sin razón especificada.";

        if (!target)
            return interaction.reply({ content: "❌ No se encontró al usuario en el servidor.", ephemeral: true });
        if (target.id === interaction.user.id)
            return interaction.reply({ content: "❌ No puedes aislarte a ti mismo.", ephemeral: true });
        if (target.permissions.has(PermissionFlagsBits.Administrator))
            return interaction.reply({ content: "❌ No puedes aislar a un Administrador.", ephemeral: true });
        if (!target.moderatable)
            return interaction.reply({ content: "❌ No tengo permisos para aislar a este usuario.", ephemeral: true });

        const { label, ms } = DURACIONES[durKey];

        try {
            await target.timeout(ms, razon);
        } catch (err) {
            return interaction.reply({
                content: `❌ Error al aplicar el aislamiento: \`${err.message}\``,
                ephemeral: true
            });
        }

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle("🔇 Aislamiento aplicado")
                    .addFields(
                        { name: "👤 Usuario",    value: `${target.user.tag}`, inline: true },
                        { name: "🛡️ Moderador", value: `${interaction.user.tag}`, inline: true },
                        { name: "⏱️ Duración",  value: label, inline: true },
                        { name: "📋 Razón",      value: razon, inline: false }
                    )
                    .setTimestamp()
            ]
        });

        try {
            await target.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setTitle(`🔇 Has sido aislado en **${guild.name}**`)
                        .addFields(
                            { name: "⏱️ Duración", value: label },
                            { name: "📋 Razón",    value: razon }
                        )
                        .setTimestamp()
                ]
            });
        } catch { /* DMs cerrados */ }
    }
};