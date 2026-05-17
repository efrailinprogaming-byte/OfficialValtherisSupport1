const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

// Nombre del rol que se otorga con /op (cámbialo según tu servidor)
const OP_ROLE_NAME = "OP";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("op")
        .setDescription("Otorga o revoca el rango OP a un usuario (acceso especial a /promote).")
        .addSubcommand((sub) =>
            sub
                .setName("dar")
                .setDescription("Otorga el rango OP a un usuario.")
                .addUserOption((opt) =>
                    opt
                        .setName("usuario")
                        .setDescription("Usuario al que darle OP.")
                        .setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName("razon")
                        .setDescription("Razón (opcional).")
                        .setRequired(false)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("quitar")
                .setDescription("Revoca el rango OP de un usuario.")
                .addUserOption((opt) =>
                    opt
                        .setName("usuario")
                        .setDescription("Usuario al que quitarle OP.")
                        .setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName("razon")
                        .setDescription("Razón (opcional).")
                        .setRequired(false)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("lista")
                .setDescription("Muestra todos los usuarios con rango OP actualmente.")
        )
        // Solo el dueño del servidor o admins pueden usar /op
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const guild = interaction.guild;

        // Buscar o crear el rol OP
        let opRole = guild.roles.cache.find((r) => r.name === OP_ROLE_NAME);

        if (!opRole) {
            try {
                opRole = await guild.roles.create({
                    name: OP_ROLE_NAME,
                    color: 0xe74c3c,
                    reason: "Rol OP creado automáticamente por el bot.",
                    permissions: [PermissionFlagsBits.ManageRoles],
                });
            } catch (err) {
                console.error("❌ Error al crear el rol OP:", err);
                return interaction.editReply({
                    content: "❌ No pude crear el rol **OP**. Verifica mis permisos.",
                });
            }
        }

        // ── /op dar ──────────────────────────────────────────────────
        if (subcommand === "dar") {
            const target = interaction.options.getMember("usuario");
            const razon = interaction.options.getString("razon") || "Sin razón especificada.";

            if (!target) {
                return interaction.editReply({ content: "❌ Usuario no encontrado en el servidor." });
            }

            if (target.user.bot) {
                return interaction.editReply({ content: "❌ No puedes dar OP a un bot." });
            }

            if (target.id === interaction.user.id) {
                return interaction.editReply({ content: "❌ No puedes darte OP a ti mismo." });
            }

            if (target.roles.cache.has(opRole.id)) {
                return interaction.editReply({
                    content: `⚠️ **${target.user.username}** ya tiene el rango OP.`,
                });
            }

            // Verificar jerarquía del bot
            const botMember = guild.members.me;
            if (opRole.position >= botMember.roles.highest.position) {
                return interaction.editReply({
                    content: `❌ El rol **${OP_ROLE_NAME}** está por encima de mi rol. No puedo asignarlo.`,
                });
            }

            try {
                await target.roles.add(opRole, `OP otorgado por ${interaction.user.tag}: ${razon}`);
            } catch (err) {
                console.error("❌ Error al dar OP:", err);
                return interaction.editReply({ content: "❌ No pude asignar el rol OP." });
            }

            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle("⚡ Rango OP Otorgado")
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: "👤 Usuario", value: `${target} (${target.user.tag})`, inline: true },
                    { name: "🔑 Rango", value: `${opRole}`, inline: true },
                    { name: "👮 Otorgado por", value: `${interaction.member}`, inline: false },
                    { name: "📋 Razón", value: razon, inline: false }
                )
                .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], ephemeral: false });

            // DM al usuario
            try {
                await target.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xe74c3c)
                            .setTitle(`⚡ ¡Ahora eres OP en ${guild.name}!`)
                            .setDescription(
                                `Se te ha otorgado el rango **${OP_ROLE_NAME}**, lo que te da acceso al comando \`/promote\`.\n\n📋 **Razón:** ${razon}`
                            )
                            .setTimestamp(),
                    ],
                });
            } catch (_) {}

        // ── /op quitar ───────────────────────────────────────────────
        } else if (subcommand === "quitar") {
            const target = interaction.options.getMember("usuario");
            const razon = interaction.options.getString("razon") || "Sin razón especificada.";

            if (!target) {
                return interaction.editReply({ content: "❌ Usuario no encontrado en el servidor." });
            }

            if (!target.roles.cache.has(opRole.id)) {
                return interaction.editReply({
                    content: `⚠️ **${target.user.username}** no tiene el rango OP.`,
                });
            }

            try {
                await target.roles.remove(opRole, `OP revocado por ${interaction.user.tag}: ${razon}`);
            } catch (err) {
                console.error("❌ Error al quitar OP:", err);
                return interaction.editReply({ content: "❌ No pude quitar el rol OP." });
            }

            const embed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle("🔒 Rango OP Revocado")
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: "👤 Usuario", value: `${target} (${target.user.tag})`, inline: true },
                    { name: "👮 Revocado por", value: `${interaction.member}`, inline: false },
                    { name: "📋 Razón", value: razon, inline: false }
                )
                .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], ephemeral: false });

            try {
                await target.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x95a5a6)
                            .setTitle(`🔒 Tu rango OP fue revocado en ${guild.name}`)
                            .setDescription(`📋 **Razón:** ${razon}`)
                            .setTimestamp(),
                    ],
                });
            } catch (_) {}

        // ── /op lista ────────────────────────────────────────────────
        } else if (subcommand === "lista") {
            await guild.members.fetch();
            const opMembers = guild.members.cache.filter((m) => m.roles.cache.has(opRole.id));

            if (opMembers.size === 0) {
                return interaction.editReply({ content: "📭 Actualmente no hay usuarios con rango OP." });
            }

            const lista = opMembers.map((m) => `• ${m} — \`${m.user.tag}\``).join("\n");

            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle(`⚡ Usuarios con rango OP (${opMembers.size})`)
                .setDescription(lista)
                .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], ephemeral: false });
        }
    },
};