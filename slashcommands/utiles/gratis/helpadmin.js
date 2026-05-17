const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

const OP_ROLE_NAME = "OP";

const COMANDOS_ADMIN = [
    {
        emoji: "📣",
        nombre: "/anuncio",
        uso: "/anuncio [titulo] [mensaje] [canal?] [ping?] [imagen?]",
        descripcion: "Envía un anuncio con embed en el canal elegido. Soporta @everyone, @here o sin ping."
    },
    {
        emoji: "⚠️",
        nombre: "/warn",
        uso: "/warn [usuario] [razon?]",
        descripcion: "Advierte a un usuario. Al acumular **5 warns**, se aplica automáticamente **1 hora de aislamiento** y se reinician sus warns."
    },
    {
        emoji: "✅",
        nombre: "/unwarn",
        uso: "/unwarn [usuario] [cantidad?]",
        descripcion: "Quita una o varias advertencias a un usuario. Por defecto quita 1."
    },
    {
        emoji: "🔇",
        nombre: "/aislamiento",
        uso: "/aislamiento [usuario] [duracion] [razon?]",
        descripcion: "Aísla manualmente a un usuario. Duraciones: 1min, 5min, 10min, 30min, 1h, 2h, 1día."
    },
    {
        emoji: "🔨",
        nombre: "/ban",
        uso: "/ban [usuario] [razon?]",
        descripcion: "Banea permanentemente a un usuario del servidor."
    },
    {
        emoji: "⚡",
        nombre: "/op dar | quitar | lista",
        uso: "/op dar [usuario] | /op quitar [usuario] | /op lista",
        descripcion: "Gestiona el rango OP. Solo Administradores pueden usarlo."
    },
    {
        emoji: "📢",
        nombre: "/promote",
        uso: "/promote [usuario] [rango]",
        descripcion: "Promueve a un usuario a un rango específico. Requiere rango OP."
    },
    {
        emoji: "🔓",
        nombre: "/unban",
        uso: "/unban [id_usuario]",
        descripcion: "Desbanea a un usuario por su ID."
    },
    {
        emoji: "🛡️",
        nombre: "/helpadmin",
        uso: "/helpadmin",
        descripcion: "Muestra este panel. Solo visible para usuarios con rango OP o Administrador."
    },
];

function hasAccess(member, guild) {
    const opRole = guild.roles.cache.find(r => r.name === OP_ROLE_NAME);
    return opRole && member.roles.cache.has(opRole.id);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("helpadmin")
        .setDescription("Muestra todos los comandos de moderación disponibles.")
        .setDefaultMemberPermissions(null),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle("🛡️ Panel de Comandos de Administración")
            .setDescription(`Estos comandos solo pueden ser usados por usuarios con el rango **${OP_ROLE_NAME}**.`)
            .setFooter({
                text: `Solicitado por ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        for (const cmd of COMANDOS_ADMIN) {
            embed.addFields({
                name: `${cmd.emoji} ${cmd.nombre}`,
                value: `**Uso:** \`${cmd.uso}\`\n${cmd.descripcion}`,
                inline: false
            });
        }

        return interaction.reply({ embeds: [embed] });
    }
};