const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

const DB_PATH       = path.resolve("./data/warns.json");
const WARNS_FOR_ISO = 5;
const ISO_DURATION_MS = 60 * 60 * 1000; // 1 hora
const OP_ROLE_NAME  = "OP";

function loadDB() {
    if (!fs.existsSync(DB_PATH)) {
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        fs.writeFileSync(DB_PATH, "{}");
    }
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function saveDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function hasAccess(member, guild) {
    const opRole = guild.roles.cache.find(r => r.name === OP_ROLE_NAME);
    return opRole && member.roles.cache.has(opRole.id);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Advierte a un usuario. 5 warns = 1 hora de aislamiento.")
        .addUserOption(opt =>
            opt.setName("usuario").setDescription("Usuario a advertir.").setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("razon").setDescription("Razón de la advertencia.").setRequired(false)
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
        const razon  = interaction.options.getString("razon") ?? "Sin razón especificada.";

        if (!target)
            return interaction.reply({ content: "❌ No se encontró al usuario en el servidor.", ephemeral: true });
        if (target.id === interaction.user.id)
            return interaction.reply({ content: "❌ No puedes advertirte a ti mismo.", ephemeral: true });
        if (target.permissions.has(PermissionFlagsBits.Administrator))
            return interaction.reply({ content: "❌ No puedes advertir a un Administrador.", ephemeral: true });

        const db        = loadDB();
        const guildData = db[guild.id] ?? {};
        const userEntry = guildData[target.id] ?? { warns: 0, log: [] };

        userEntry.warns += 1;
        userEntry.log.push({ razon, moderador: interaction.user.tag, fecha: new Date().toISOString() });
        guildData[target.id] = userEntry;
        db[guild.id]         = guildData;
        saveDB(db);

        const totalWarns = userEntry.warns;

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xe67e22)
                    .setTitle("⚠️ Advertencia emitida")
                    .addFields(
                        { name: "👤 Usuario",        value: `${target.user.tag}`, inline: true },
                        { name: "🛡️ Moderador",      value: `${interaction.user.tag}`, inline: true },
                        { name: "📋 Razón",           value: razon, inline: false },
                        { name: "⚠️ Total de warns", value: `${totalWarns} / ${WARNS_FOR_ISO}`, inline: true }
                    )
                    .setTimestamp()
            ]
        });

        try {
            await target.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xe67e22)
                        .setTitle(`⚠️ Has recibido una advertencia en **${guild.name}**`)
                        .addFields(
                            { name: "📋 Razón",               value: razon },
                            { name: "⚠️ Tus warns actuales", value: `${totalWarns} / ${WARNS_FOR_ISO}` }
                        )
                        .setTimestamp()
                ]
            });
        } catch { /* DMs cerrados */ }

        // 5 warns → aislamiento automático 1 hora
        if (totalWarns >= WARNS_FOR_ISO) {
            try {
                await target.timeout(ISO_DURATION_MS, `Acumuló ${WARNS_FOR_ISO} advertencias.`);

                userEntry.warns = 0;
                userEntry.log.push({
                    razon: `[AUTO] Aislamiento aplicado por ${WARNS_FOR_ISO} warns.`,
                    moderador: "Sistema",
                    fecha: new Date().toISOString()
                });
                saveDB(db);

                await interaction.followUp({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xe74c3c)
                            .setTitle("🔇 Aislamiento automático aplicado")
                            .setDescription(
                                `${target.user.tag} acumuló **${WARNS_FOR_ISO} advertencias** y fue aislado por **1 hora**.\nSus warns fueron reiniciados.`
                            )
                            .setTimestamp()
                    ]
                });
            } catch (err) {
                await interaction.followUp({
                    content: `⚠️ No pude aislar a ${target.user.tag}: \`${err.message}\``,
                    ephemeral: true
                });
            }
        }
    }
};