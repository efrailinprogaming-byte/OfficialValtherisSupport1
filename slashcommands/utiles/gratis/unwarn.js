const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const fs   = require("node:fs");
const path = require("node:path");

const DB_PATH      = path.resolve("./data/warns.json");
const OP_ROLE_NAME = "OP";

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
        .setName("unwarn")
        .setDescription("Quita una o varias advertencias a un usuario.")
        .addUserOption(opt =>
            opt.setName("usuario").setDescription("Usuario al que quitar el warn.").setRequired(true)
        )
        .addIntegerOption(opt =>
            opt.setName("cantidad")
                .setDescription("Cantidad de warns a quitar (por defecto 1).")
                .setRequired(false)
                .setMinValue(1)
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

        const target   = interaction.options.getMember("usuario");
        const cantidad = interaction.options.getInteger("cantidad") ?? 1;

        if (!target)
            return interaction.reply({ content: "❌ No se encontró al usuario en el servidor.", ephemeral: true });

        const db        = loadDB();
        const guildData = db[guild.id] ?? {};
        const userEntry = guildData[target.id] ?? { warns: 0, log: [] };

        if (userEntry.warns === 0) {
            return interaction.reply({
                content: `ℹ️ **${target.user.tag}** no tiene advertencias activas.`,
                ephemeral: true
            });
        }

        const antes = userEntry.warns;
        userEntry.warns = Math.max(0, userEntry.warns - cantidad);
        userEntry.log.push({
            razon: `[UNWARN] Se quitaron ${antes - userEntry.warns} advertencia(s).`,
            moderador: interaction.user.tag,
            fecha: new Date().toISOString()
        });

        guildData[target.id] = userEntry;
        db[guild.id]         = guildData;
        saveDB(db);

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle("✅ Advertencia removida")
                    .addFields(
                        { name: "👤 Usuario",         value: `${target.user.tag}`, inline: true },
                        { name: "🛡️ Moderador",       value: `${interaction.user.tag}`, inline: true },
                        { name: "⚠️ Warns anteriores", value: `${antes}`, inline: true },
                        { name: "⚠️ Warns actuales",  value: `${userEntry.warns}`, inline: true }
                    )
                    .setTimestamp()
            ]
        });
    }
};  