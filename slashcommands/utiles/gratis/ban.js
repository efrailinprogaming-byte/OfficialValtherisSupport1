const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

const OP_ROLE_NAME = "OP";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("baneo")
        .setDescription("Banea a un usuario del servidor.")
        .addUserOption(opt =>
            opt.setName("usuario").setDescription("Usuario a banear.").setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("razon").setDescription("Razón del baneo (opcional).").setRequired(false)
        )
        .addIntegerOption(opt =>
            opt.setName("dias").setDescription("Días del baneo (0 = permanente).").setRequired(false).setMinValue(0).setMaxValue(365)
        )
        .addIntegerOption(opt =>
            opt.setName("horas").setDescription("Horas del baneo.").setRequired(false).setMinValue(0).setMaxValue(23)
        )
        .addIntegerOption(opt =>
            opt.setName("minutos").setDescription("Minutos del baneo.").setRequired(false).setMinValue(0).setMaxValue(59)
        )
        .addIntegerOption(opt =>
            opt.setName("segundos").setDescription("Segundos del baneo.").setRequired(false).setMinValue(0).setMaxValue(59)
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

        const target = interaction.options.getMember("usuario");
        const razon = interaction.options.getString("razon") || "Sin razón especificada.";
        const dias = interaction.options.getInteger("dias") ?? 0;
        const horas = interaction.options.getInteger("horas") ?? 0;
        const minutos = interaction.options.getInteger("minutos") ?? 0;
        const segundos = interaction.options.getInteger("segundos") ?? 0;

        if (!target) {
            return interaction.reply({ content: "❌ Usuario no encontrado en el servidor.", ephemeral: true });
        }

        if (target.user.bot) {
            return interaction.reply({ content: "❌ No puedes banear a un bot.", ephemeral: true });
        }

        if (target.id === executor.id) {
            return interaction.reply({ content: "❌ No puedes banearte a ti mismo.", ephemeral: true });
        }

        if (!target.bannable) {
            return interaction.reply({ content: "❌ No puedo banear a este usuario. Puede tener un rol superior al mío.", ephemeral: true });
        }

        // Calcular duración total en ms
        const totalMs = ((dias * 24 * 60 * 60) + (horas * 60 * 60) + (minutos * 60) + segundos) * 1000;
        const permanente = totalMs === 0;

        // Formatear duración para mostrar
        const partes = [];
        if (dias > 0) partes.push(`${dias} día(s)`);
        if (horas > 0) partes.push(`${horas} hora(s)`);
        if (minutos > 0) partes.push(`${minutos} minuto(s)`);
        if (segundos > 0) partes.push(`${segundos} segundo(s)`);
        const duracionTexto = permanente ? "🔴 Permanente" : partes.join(", ");

        // Enviar DM antes de banear
        try {
            await target.send({
                embeds: [new EmbedBuilder()
                    .setColor(0xed4245)
                    .setTitle(`🔨 Has sido baneado de ${guild.name}`)
                    .addFields(
                        { name: "📋 Razón", value: razon },
                        { name: "⏱️ Duración", value: duracionTexto },
                        { name: "👮 Baneado por", value: executor.user.tag }
                    )
                    .setTimestamp()
                ]
            });
        } catch (_) {}

        // Ejecutar baneo
        await target.ban({ reason: `${executor.user.tag}: ${razon}` });

        // Si el baneo es temporal, desbanear después del tiempo
        if (!permanente) {
            setTimeout(async () => {
                try {
                    await guild.members.unban(target.user.id, "Baneo temporal expirado.");
                    // Notificar al usuario que fue desbaneado
                    try {
                        await target.user.send({
                            embeds: [new EmbedBuilder()
                                .setColor(0x57f287)
                                .setTitle(`✅ Tu baneo en ${guild.name} ha expirado`)
                                .setDescription("Ya puedes volver a unirte al servidor.")
                                .setTimestamp()
                            ]
                        });
                    } catch (_) {}
                } catch (_) {}
            }, totalMs);
        }

        const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("🔨 Usuario Baneado")
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: "👤 Usuario", value: `${target.user.tag}`, inline: true },
                { name: "👮 Baneado por", value: `${executor.user.tag}`, inline: true },
                { name: "📋 Razón", value: razon },
                { name: "⏱️ Duración", value: duracionTexto, inline: true }
            )
            .setFooter({ text: guild.name })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};