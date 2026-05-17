const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

const OP_ROLE_NAME = "OP";

const COLORES = {
    rojo:    0xe74c3c,
    azul:    0x3498db,
    verde:   0x2ecc71,
    dorado:  0xf1c40f,
    morado:  0x9b59b6,
    naranja: 0xe67e22,
};

function hasAccess(member, guild) {
    const opRole = guild.roles.cache.find(r => r.name === OP_ROLE_NAME);
    return opRole && member.roles.cache.has(opRole.id);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("anuncio")
        .setDescription("Envía un anuncio con diseño en el canal que elijas.")
        .addStringOption(opt =>
            opt.setName("titulo").setDescription("Título del anuncio.").setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("mensaje").setDescription("Contenido del anuncio. Usa \\n para saltos de línea.").setRequired(true)
        )
        .addChannelOption(opt =>
            opt.setName("canal").setDescription("Canal donde enviar el anuncio (por defecto el actual).").setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName("color")
                .setDescription("Color del borde del anuncio.")
                .setRequired(false)
                .addChoices(
                    { name: "🔴 Rojo",    value: "rojo" },
                    { name: "🔵 Azul",    value: "azul" },
                    { name: "🟢 Verde",   value: "verde" },
                    { name: "🟡 Dorado",  value: "dorado" },
                    { name: "🟣 Morado",  value: "morado" },
                    { name: "🟠 Naranja", value: "naranja" }
                )
        )
        .addStringOption(opt =>
            opt.setName("ping")
                .setDescription("Mencionar en el anuncio (opcional).")
                .setRequired(false)
                .addChoices(
                    { name: "@everyone", value: "@everyone" },
                    { name: "@here",     value: "@here" },
                    { name: "Ninguno",   value: "ninguno" }
                )
        )
        .addStringOption(opt =>
            opt.setName("imagen").setDescription("URL de imagen grande (opcional).").setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName("miniatura").setDescription("URL de miniatura esquina derecha (opcional).").setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const executor = interaction.member;
        const guild    = interaction.guild;

        if (!hasAccess(executor, guild)) {
            return interaction.reply({
                content: `❌ No tienes permiso. Necesitas el rango **${OP_ROLE_NAME}**.`,
                ephemeral: true
            });
        }

        const titulo    = interaction.options.getString("titulo");
        const mensaje   = interaction.options.getString("mensaje").replace(/\\n/g, "\n");
        const canal     = interaction.options.getChannel("canal") || interaction.channel;
        const color     = interaction.options.getString("color") ?? "rojo";
        const ping      = interaction.options.getString("ping") ?? "ninguno";
        const imagen    = interaction.options.getString("imagen");
        const miniatura = interaction.options.getString("miniatura");

        if (!canal.isTextBased()) {
            return interaction.reply({ content: "❌ El canal seleccionado no es un canal de texto.", ephemeral: true });
        }

        const botMember = await guild.members.fetchMe();
        if (!canal.permissionsFor(botMember).has(PermissionFlagsBits.SendMessages)) {
            return interaction.reply({
                content: `❌ No tengo permisos para enviar mensajes en ${canal}.`,
                ephemeral: true
            });
        }

        for (const [nombre, url] of [["imagen", imagen], ["miniatura", miniatura]]) {
            if (url) {
                try { new URL(url); }
                catch {
                    return interaction.reply({ content: `❌ La URL de la **${nombre}** no es válida.`, ephemeral: true });
                }
            }
        }

        const ahora = new Date();
        const fecha = ahora.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
        const hora  = ahora.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

        const embed = new EmbedBuilder()
            .setColor(COLORES[color])
            .setAuthor({
                name: `${guild.name} — Anuncio Oficial`,
                iconURL: guild.iconURL({ dynamic: true }) ?? undefined
            })
            .setTitle(`📢  ${titulo}`)
            .setDescription(
                `> ${mensaje.split("\n").join("\n> ")}\n\u200b`
            )
            .addFields(
                { name: "🕐 Fecha",         value: `${fecha} a las ${hora}`, inline: true },
                { name: "👮 Moderador",      value: `${executor}`,            inline: true }
            )
            .setFooter({
                text: `${guild.name}`,
                iconURL: guild.iconURL({ dynamic: true }) ?? undefined
            })
            .setTimestamp();

        if (miniatura) embed.setThumbnail(miniatura);
        if (imagen)    embed.setImage(imagen);

        const contenido = ping !== "ninguno" ? ping : undefined;

        // El anuncio se envía público en el canal
        await canal.send({ content: contenido, embeds: [embed] });

        // Solo el OP que lo usó ve esta confirmación
        return interaction.reply({
            content: `✅ Anuncio enviado en ${canal}.`,
            ephemeral: true
        });
    }
};