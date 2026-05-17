const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

const OP_ROLE_NAME = "OP";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("promote")
        .setDescription("Promueve a un miembro a un rol superior en el servidor.")
        .addUserOption((option) =>
            option.setName("usuario").setDescription("El usuario que deseas promover.").setRequired(true)
        )
        .addRoleOption((option) =>
            option.setName("rol").setDescription("El rol al que deseas promover al usuario.").setRequired(true)
        )
        .addStringOption((option) =>
            option.setName("duracion").setDescription("¿Por cuánto tiempo? Escribe 'permanente' o deja vacío.").setRequired(false)
                .addChoices(
                    { name: "♾️ Permanente", value: "permanente" },
                    { name: "⏱️ Personalizado (días/horas/min/seg)", value: "personalizado" }
                )
        )
        .addIntegerOption((option) =>
            option.setName("dias").setDescription("Días que tendrá el rol.").setRequired(false).setMinValue(0).setMaxValue(365)
        )
        .addIntegerOption((option) =>
            option.setName("horas").setDescription("Horas que tendrá el rol.").setRequired(false).setMinValue(0).setMaxValue(23)
        )
        .addIntegerOption((option) =>
            option.setName("minutos").setDescription("Minutos que tendrá el rol.").setRequired(false).setMinValue(0).setMaxValue(59)
        )
        .addIntegerOption((option) =>
            option.setName("segundos").setDescription("Segundos que tendrá el rol.").setRequired(false).setMinValue(0).setMaxValue(59)
        )
        .addStringOption((option) =>
            option.setName("razon").setDescription("Razón de la promoción (opcional).").setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    async execute(interaction) {
        await interaction.deferReply();

        const executor = interaction.member;
        const guild = interaction.guild;

        const opRole = guild.roles.cache.find((r) => r.name === OP_ROLE_NAME);
        const isAdmin = executor.permissions.has(PermissionFlagsBits.Administrator);
        const isOP = opRole && executor.roles.cache.has(opRole.id);

        if (!isAdmin && !isOP) {
            return interaction.editReply({
                content: `❌ No tienes permiso. Necesitas el rango **${OP_ROLE_NAME}** o ser Administrador.`,
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getMember("usuario");
        const targetRole = interaction.options.getRole("rol");
        const duracion = interaction.options.getString("duracion") || "permanente";
        const dias = interaction.options.getInteger("dias") ?? 0;
        const horas = interaction.options.getInteger("horas") ?? 0;
        const minutos = interaction.options.getInteger("minutos") ?? 0;
        const segundos = interaction.options.getInteger("segundos") ?? 0;
        const razon = interaction.options.getString("razon") || "Sin razón especificada.";

        if (!targetUser) return interaction.editReply({ content: "❌ No se encontró al usuario.", ephemeral: true });
        if (targetUser.user.bot) return interaction.editReply({ content: "❌ No puedes promover a un bot.", ephemeral: true });
        if (!targetRole) return interaction.editReply({ content: "❌ El rol no existe.", ephemeral: true });

        const botMember = guild.members.me;
        if (targetRole.position >= botMember.roles.highest.position) {
            return interaction.editReply({ content: `❌ No puedo asignar el rol **${targetRole.name}**, está por encima de mi rol.`, ephemeral: true });
        }

        if (targetRole.position >= executor.roles.highest.position) {
            return interaction.editReply({ content: `❌ No puedes promover a alguien a un rol igual o superior al tuyo.`, ephemeral: true });
        }

        if (targetUser.roles.cache.has(targetRole.id)) {
            return interaction.editReply({ content: `⚠️ **${targetUser.user.username}** ya posee el rol **${targetRole.name}**.`, ephemeral: true });
        }

        // Calcular duración
        const totalMs = ((dias * 24 * 60 * 60) + (horas * 60 * 60) + (minutos * 60) + segundos) * 1000;
        const esPermanente = duracion === "permanente" || totalMs === 0;

        const partes = [];
        if (dias > 0) partes.push(`${dias} día(s)`);
        if (horas > 0) partes.push(`${horas} hora(s)`);
        if (minutos > 0) partes.push(`${minutos} minuto(s)`);
        if (segundos > 0) partes.push(`${segundos} segundo(s)`);
        const duracionTexto = esPermanente ? "♾️ Permanente" : partes.join(", ");

        try {
            await targetUser.roles.add(targetRole, `Promovido por ${executor.user.tag}: ${razon}`);
        } catch (error) {
            console.error("❌ Error al asignar el rol:", error);
            return interaction.editReply({ content: "❌ Error al asignar el rol. Verifica mis permisos.", ephemeral: true });
        }

        // Si es temporal, quitar el rol después
        if (!esPermanente) {
            setTimeout(async () => {
                try {
                    await targetUser.roles.remove(targetRole, "Promoción temporal expirada.");
                    await targetUser.send({
                        embeds: [new EmbedBuilder()
                            .setColor(0x95a5a6)
                            .setTitle(`⏰ Tu promoción en ${guild.name} ha expirado`)
                            .setDescription(`El rol **${targetRole.name}** te fue retirado automáticamente.`)
                            .setTimestamp()
                        ]
                    }).catch(() => {});
                } catch (_) {}
            }, totalMs);
        }

        const embed = new EmbedBuilder()
            .setColor(targetRole.color || 0x5865f2)
            .setTitle("🎖️ Promoción Exitosa")
            .setThumbnail(targetUser.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: "👤 Usuario Promovido", value: `${targetUser} (${targetUser.user.tag})`, inline: true },
                { name: "🏅 Nuevo Rol", value: `${targetRole}`, inline: true },
                { name: "⏱️ Duración", value: duracionTexto, inline: true },
                { name: "👮 Promovido por", value: `${executor} (${executor.user.tag})`, inline: false },
                { name: "📋 Razón", value: razon, inline: false }
            )
            .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        // DM al usuario
        try {
            await targetUser.send({
                embeds: [new EmbedBuilder()
                    .setColor(targetRole.color || 0x5865f2)
                    .setTitle(`🎉 ¡Has sido promovido en ${guild.name}!`)
                    .setDescription(`Has recibido el rol **${targetRole.name}**.\n\n⏱️ **Duración:** ${duracionTexto}\n📋 **Razón:** ${razon}`)
                    .setTimestamp()
                ]
            });
        } catch (_) {}
    }
};