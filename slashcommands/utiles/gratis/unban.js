const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

const OP_ROLE_NAME = "OP";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Desbanea a un usuario del servidor.")
        .addStringOption(opt =>
            opt.setName("userid").setDescription("ID del usuario a desbanear.").setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("razon").setDescription("Razón del desbaneo (opcional).").setRequired(false)
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

        const userId = interaction.options.getString("userid").trim();
        const razon = interaction.options.getString("razon") || "Sin razón especificada.";

        // Verificar que el ID es válido
        if (!/^\d{17,20}$/.test(userId)) {
            return interaction.reply({ content: "❌ ID inválido. Asegúrate de copiar el ID correctamente.", ephemeral: true });
        }

        // Verificar que está baneado
        let banEntry;
        try {
            banEntry = await guild.bans.fetch(userId);
        } catch {
            return interaction.reply({ content: "❌ Este usuario no está baneado en el servidor.", ephemeral: true });
        }

        await guild.members.unban(userId, `${executor.user.tag}: ${razon}`);

        const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("✅ Usuario Desbaneado")
            .addFields(
                { name: "👤 Usuario", value: `${banEntry.user.tag} (${userId})`, inline: true },
                { name: "👮 Desbaneado por", value: `${executor.user.tag}`, inline: true },
                { name: "📋 Razón", value: razon }
            )
            .setFooter({ text: guild.name })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Intentar notificar al usuario desbaneado por DM
        try {
            const user = await interaction.client.users.fetch(userId);
            await user.send({
                embeds: [new EmbedBuilder()
                    .setColor(0x57f287)
                    .setTitle(`✅ Has sido desbaneado de ${guild.name}`)
                    .addFields(
                        { name: "📋 Razón", value: razon },
                        { name: "👮 Desbaneado por", value: executor.user.tag }
                    )
                    .setTimestamp()
                ]
            });
        } catch (_) {}
    }
};