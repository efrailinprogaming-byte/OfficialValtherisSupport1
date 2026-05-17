const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const fs = require("fs");

const OP_ROLE_NAME = "OP";
const CONFIG_FILE = "./data/automod.json";
const DATA_DIR = "./data";
const WARNS_FILE = "./data/automod_warns.json";

const msgTracker = new Map();
const cooldownTracker = new Map();

function loadConfig() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(CONFIG_FILE)) {
        const def = {
            enabled: false,
            filtros: {
                palabras: { enabled: false, lista: [] },
                links: { enabled: false },
                spam: { enabled: false, limite: 5, segundos: 5 },
                mayusculas: { enabled: false, porcentaje: 80 },
                menciones: { enabled: false, limite: 3 },
                emojis: { enabled: false, limite: 10 },
                invitaciones: { enabled: false },
                repetidos: { enabled: false },
                minCaracteres: { enabled: false, minimo: 3 },
                cooldown: { enabled: false, segundos: 5 }
            },
            accion: "borrar",
            muteDuracion: 5,
            warnLimit: 3,
            logChannel: null
        };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(def, null, 2));
        return def;
    }
    return JSON.parse(fs.readFileSync(CONFIG_FILE));
}

function saveConfig(data) { fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2)); }

function loadWarns() {
    if (!fs.existsSync(WARNS_FILE)) fs.writeFileSync(WARNS_FILE, JSON.stringify({}));
    return JSON.parse(fs.readFileSync(WARNS_FILE));
}

function saveWarns(data) { fs.writeFileSync(WARNS_FILE, JSON.stringify(data, null, 2)); }

function buildSetupEmbed(config) {
    const f = config.filtros;
    return new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🛡️ AutoMod — Panel de Configuración")
        .setDescription("Selecciona una opción del menú para configurarla.")
        .addFields(
            { name: "🤬 Palabras", value: f.palabras.enabled ? `✅ (${f.palabras.lista.length})` : "❌", inline: true },
            { name: "🔗 Links", value: f.links.enabled ? "✅" : "❌", inline: true },
            { name: "📢 Spam", value: f.spam.enabled ? `✅ (${f.spam.limite}msg/${f.spam.segundos}s)` : "❌", inline: true },
            { name: "🔠 Mayúsculas", value: f.mayusculas.enabled ? `✅ (${f.mayusculas.porcentaje}%)` : "❌", inline: true },
            { name: "👤 Menciones", value: f.menciones.enabled ? `✅ (máx ${f.menciones.limite})` : "❌", inline: true },
            { name: "😂 Emojis", value: f.emojis.enabled ? `✅ (máx ${f.emojis.limite})` : "❌", inline: true },
            { name: "🎟️ Invitaciones", value: f.invitaciones.enabled ? "✅" : "❌", inline: true },
            { name: "🔁 Repetidos", value: f.repetidos.enabled ? "✅" : "❌", inline: true },
            { name: "🔤 Mín. Caracteres", value: f.minCaracteres.enabled ? `✅ (mín ${f.minCaracteres.minimo})` : "❌", inline: true },
            { name: "⏱️ Cooldown", value: f.cooldown.enabled ? `✅ (${f.cooldown.segundos}s)` : "❌", inline: true },
            { name: "⚡ Acción", value: config.accion === "borrar" ? "🗑️ Borrar" : config.accion === "mute" ? `🔇 Mute (${config.muteDuracion}min)` : `⚠️ Warn (límite: ${config.warnLimit})`, inline: true },
            { name: "📋 Logs", value: config.logChannel ? `<#${config.logChannel}>` : "❌", inline: true }
        )
        .setTimestamp();
}

function buildMenu() {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("automod_setup_menu")
            .setPlaceholder("Selecciona qué configurar...")
            .addOptions([
                { label: "🤬 Palabras prohibidas", value: "palabras" },
                { label: "🔗 Links", value: "links" },
                { label: "📢 Spam", value: "spam" },
                { label: "🔠 Mayúsculas", value: "mayusculas" },
                { label: "👤 Menciones masivas", value: "menciones" },
                { label: "😂 Emojis excesivos", value: "emojis" },
                { label: "🎟️ Invitaciones de Discord", value: "invitaciones" },
                { label: "🔁 Mensajes repetidos", value: "repetidos" },
                { label: "🔤 Mínimo de caracteres", value: "minCaracteres" },
                { label: "⏱️ Cooldown entre mensajes", value: "cooldown" },
                { label: "⚡ Acción al detectar", value: "accion" },
                { label: "📋 Canal de logs", value: "logs" }
            ])
    );
}

async function takeAction(member, config, motivo, channel, userId) {
    if (config.accion === "mute") {
        try { await member.timeout(config.muteDuracion * 60 * 1000, `AutoMod: ${motivo}`); } catch (_) {}
    } else if (config.accion === "warn") {
        const warns = loadWarns();
        if (!warns[userId]) warns[userId] = 0;
        warns[userId]++;
        saveWarns(warns);
        if (warns[userId] >= config.warnLimit) {
            try { await member.timeout(config.muteDuracion * 60 * 1000, `AutoMod: ${config.warnLimit} warns`); warns[userId] = 0; saveWarns(warns); } catch (_) {}
        }
    }

    const accionTexto = config.accion === "mute"
        ? `🔇 Silenciado por **${config.muteDuracion} minutos**.`
        : config.accion === "warn"
        ? `⚠️ Aviso (${loadWarns()[userId] || 0}/${config.warnLimit})`
        : "";

    const aviso = await channel.send({
        embeds: [new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("🛡️ AutoMod")
            .setDescription(`${member}, tu mensaje fue eliminado.\n**Motivo:** ${motivo}\n${accionTexto}`)
            .setTimestamp()
        ]
    });
    setTimeout(() => aviso.delete().catch(() => {}), 6000);

    if (config.logChannel) {
        const logCh = member.guild.channels.cache.get(config.logChannel);
        if (logCh) {
            logCh.send({
                embeds: [new EmbedBuilder()
                    .setColor(0xed4245)
                    .setTitle("🛡️ AutoMod — Acción")
                    .addFields(
                        { name: "👤 Usuario", value: member.user.tag, inline: true },
                        { name: "📍 Canal", value: `${channel}`, inline: true },
                        { name: "❌ Motivo", value: motivo },
                        { name: "⚡ Acción", value: config.accion }
                    )
                    .setTimestamp()
                ]
            });
        }
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("automod")
        .setDescription("Sistema de moderación automática.")
        .addSubcommand(sub => sub
            .setName("estado")
            .setDescription("Activa o desactiva el automod.")
            .addBooleanOption(opt => opt.setName("activo").setDescription("¿Activar?").setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName("setup")
            .setDescription("Panel de configuración del automod.")
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    register(client) {
        client.on("messageCreate", async (message) => {
            if (message.author.bot || !message.guild) return;
            const config = loadConfig();
            if (!config.enabled) return;

            const member = message.member;
            if (!member) return;

            const opRole = message.guild.roles.cache.find(r => r.name === OP_ROLE_NAME);
            if (member.permissions.has(PermissionFlagsBits.Administrator)) return;
            if (opRole && member.roles.cache.has(opRole.id)) return;

            const content = message.content;
            const userId = message.author.id;
            let motivo = null;

            if (!motivo && config.filtros.cooldown.enabled) {
                const now = Date.now();
                const ultimo = cooldownTracker.get(userId);
                if (ultimo && now - ultimo < config.filtros.cooldown.segundos * 1000)
                    motivo = `Debes esperar ${config.filtros.cooldown.segundos}s entre mensajes`;
                cooldownTracker.set(userId, now);
            }

            if (!motivo && config.filtros.minCaracteres.enabled && content.trim().length < config.filtros.minCaracteres.minimo)
                motivo = `Mensaje muy corto (mín. ${config.filtros.minCaracteres.minimo} caracteres)`;

            if (!motivo && config.filtros.palabras.enabled) {
                const lower = content.toLowerCase();
                const encontrada = config.filtros.palabras.lista.find(p => lower.includes(p));
                if (encontrada) motivo = `Palabra prohibida: \`${encontrada}\``;
            }

            if (!motivo && config.filtros.links.enabled && /(https?:\/\/|www\.)\S+/gi.test(content))
                motivo = "Link detectado";

            if (!motivo && config.filtros.invitaciones.enabled && /(discord\.gg|discord\.com\/invite)\/\S+/gi.test(content))
                motivo = "Invitación detectada";

            if (!motivo && config.filtros.mayusculas.enabled && content.length > 8) {
                const letras = content.replace(/[^a-zA-Z]/g, "");
                if (letras.length > 0) {
                    const pct = (content.replace(/[^A-Z]/g, "").length / letras.length) * 100;
                    if (pct >= config.filtros.mayusculas.porcentaje) motivo = `Exceso de mayúsculas (${Math.round(pct)}%)`;
                }
            }

            if (!motivo && config.filtros.menciones.enabled) {
                const total = message.mentions.users.size + message.mentions.roles.size;
                if (total >= config.filtros.menciones.limite) motivo = `Demasiadas menciones (${total})`;
            }

            if (!motivo && config.filtros.emojis.enabled) {
                const count = (content.match(/(\p{Emoji_Presentation}|\p{Extended_Pictographic}|<a?:\w+:\d+>)/gu) || []).length;
                if (count >= config.filtros.emojis.limite) motivo = `Demasiados emojis (${count})`;
            }

            if (!motivo && config.filtros.spam.enabled) {
                const now = Date.now();
                if (!msgTracker.has(userId)) msgTracker.set(userId, []);
                const msgs = msgTracker.get(userId).filter(t => now - t < config.filtros.spam.segundos * 1000);
                msgs.push(now);
                msgTracker.set(userId, msgs);
                if (msgs.length >= config.filtros.spam.limite) motivo = `Spam (${msgs.length} msgs en ${config.filtros.spam.segundos}s)`;
            }

            if (!motivo && config.filtros.repetidos.enabled) {
                const key = `rep_${userId}`;
                const ultimo = msgTracker.get(key);
                if (ultimo && ultimo === content.trim().toLowerCase()) motivo = "Mensaje repetido";
                msgTracker.set(key, content.trim().toLowerCase());
            }

            if (!motivo) return;
            await message.delete().catch(() => {});
            await takeAction(member, config, motivo, message.channel, userId);
        });

        console.log("🛡️ AutoMod registrado.");
    },

    async execute(interaction) {
        const executor = interaction.member;
        const guild = interaction.guild;

        const opRole = guild.roles.cache.find(r => r.name === OP_ROLE_NAME);
        const isAdmin = executor.permissions.has(PermissionFlagsBits.Administrator);
        const isOP = opRole && executor.roles.cache.has(opRole.id);

        if (!isAdmin && !isOP) return interaction.reply({ content: `❌ No tienes permiso.`, ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const config = loadConfig();

        if (sub === "estado") {
            config.enabled = interaction.options.getBoolean("activo");
            saveConfig(config);
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(config.enabled ? 0x57f287 : 0xed4245)
                    .setTitle("🛡️ AutoMod")
                    .setDescription(`El automod ha sido **${config.enabled ? "activado ✅" : "desactivado ❌"}**.`)
                    .setTimestamp()
                ],
                ephemeral: true
            });
        }

        if (sub === "setup") {
            await interaction.reply({ embeds: [buildSetupEmbed(config)], components: [buildMenu()] });

            const collector = interaction.channel.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 180000
            });

            collector.on("collect", async i => {
                const cfg = loadConfig();

                if (i.customId === "automod_setup_menu") {
                    const op = i.values[0];

                    if (["links", "invitaciones", "repetidos"].includes(op)) {
                        cfg.filtros[op].enabled = !cfg.filtros[op].enabled;
                        saveConfig(cfg);
                        return i.update({ embeds: [buildSetupEmbed(cfg)], components: [buildMenu()] });
                    }

                    const modales = {
                        palabras: () => new ModalBuilder()
                            .setCustomId("automod_palabras_modal")
                            .setTitle("🤬 Palabras Prohibidas")
                            .addComponents(
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("palabras_lista").setLabel("Palabras separadas por comas").setStyle(TextInputStyle.Paragraph).setValue(cfg.filtros.palabras.lista.join(", ")).setRequired(false)),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("palabras_activo").setLabel("¿Activar? (si/no)").setStyle(TextInputStyle.Short).setValue(cfg.filtros.palabras.enabled ? "si" : "no").setRequired(true))
                            ),
                        spam: () => new ModalBuilder()
                            .setCustomId("automod_spam_modal")
                            .setTitle("📢 Spam")
                            .addComponents(
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("spam_activo").setLabel("¿Activar? (si/no)").setStyle(TextInputStyle.Short).setValue(cfg.filtros.spam.enabled ? "si" : "no").setRequired(true)),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("spam_limite").setLabel("Máx. mensajes").setStyle(TextInputStyle.Short).setValue(String(cfg.filtros.spam.limite)).setRequired(true)),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("spam_segundos").setLabel("Intervalo en segundos").setStyle(TextInputStyle.Short).setValue(String(cfg.filtros.spam.segundos)).setRequired(true))
                            ),
                        mayusculas: () => new ModalBuilder()
                            .setCustomId("automod_mayusculas_modal")
                            .setTitle("🔠 Mayúsculas")
                            .addComponents(
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("mayus_activo").setLabel("¿Activar? (si/no)").setStyle(TextInputStyle.Short).setValue(cfg.filtros.mayusculas.enabled ? "si" : "no").setRequired(true)),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("mayus_porcentaje").setLabel("% máximo (50-100)").setStyle(TextInputStyle.Short).setValue(String(cfg.filtros.mayusculas.porcentaje)).setRequired(true))
                            ),
                        menciones: () => new ModalBuilder()
                            .setCustomId("automod_menciones_modal")
                            .setTitle("👤 Menciones")
                            .addComponents(
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("menciones_activo").setLabel("¿Activar? (si/no)").setStyle(TextInputStyle.Short).setValue(cfg.filtros.menciones.enabled ? "si" : "no").setRequired(true)),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("menciones_limite").setLabel("Máx. menciones").setStyle(TextInputStyle.Short).setValue(String(cfg.filtros.menciones.limite)).setRequired(true))
                            ),
                        emojis: () => new ModalBuilder()
                            .setCustomId("automod_emojis_modal")
                            .setTitle("😂 Emojis")
                            .addComponents(
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("emojis_activo").setLabel("¿Activar? (si/no)").setStyle(TextInputStyle.Short).setValue(cfg.filtros.emojis.enabled ? "si" : "no").setRequired(true)),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("emojis_limite").setLabel("Máx. emojis").setStyle(TextInputStyle.Short).setValue(String(cfg.filtros.emojis.limite)).setRequired(true))
                            ),
                        minCaracteres: () => new ModalBuilder()
                            .setCustomId("automod_mincar_modal")
                            .setTitle("🔤 Mínimo Caracteres")
                            .addComponents(
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("mincar_activo").setLabel("¿Activar? (si/no)").setStyle(TextInputStyle.Short).setValue(cfg.filtros.minCaracteres.enabled ? "si" : "no").setRequired(true)),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("mincar_minimo").setLabel("Mínimo de caracteres").setStyle(TextInputStyle.Short).setValue(String(cfg.filtros.minCaracteres.minimo)).setRequired(true))
                            ),
                        cooldown: () => new ModalBuilder()
                            .setCustomId("automod_cooldown_modal")
                            .setTitle("⏱️ Cooldown")
                            .addComponents(
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("cooldown_activo").setLabel("¿Activar? (si/no)").setStyle(TextInputStyle.Short).setValue(cfg.filtros.cooldown.enabled ? "si" : "no").setRequired(true)),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("cooldown_segundos").setLabel("Segundos de espera").setStyle(TextInputStyle.Short).setValue(String(cfg.filtros.cooldown.segundos)).setRequired(true))
                            ),
                        accion: () => new ModalBuilder()
                            .setCustomId("automod_accion_modal")
                            .setTitle("⚡ Acción")
                            .addComponents(
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("accion_tipo").setLabel("borrar / mute / warn").setStyle(TextInputStyle.Short).setValue(cfg.accion).setRequired(true)),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("accion_mute").setLabel("Minutos de mute").setStyle(TextInputStyle.Short).setValue(String(cfg.muteDuracion)).setRequired(false)),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("accion_warns").setLabel("Warns antes de mute").setStyle(TextInputStyle.Short).setValue(String(cfg.warnLimit)).setRequired(false))
                            ),
                        logs: () => new ModalBuilder()
                            .setCustomId("automod_logs_modal")
                            .setTitle("📋 Canal de Logs")
                            .addComponents(
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("logs_canal").setLabel("ID del canal").setStyle(TextInputStyle.Short).setValue(cfg.logChannel || "").setRequired(true))
                            )
                    };

                    if (modales[op]) return i.showModal(modales[op]());
                }

                const handlers = {
                    automod_palabras_modal: (i, cfg) => {
                        cfg.filtros.palabras.enabled = i.fields.getTextInputValue("palabras_activo").toLowerCase() === "si";
                        const l = i.fields.getTextInputValue("palabras_lista");
                        cfg.filtros.palabras.lista = l ? l.split(",").map(p => p.trim().toLowerCase()).filter(Boolean) : [];
                    },
                    automod_spam_modal: (i, cfg) => {
                        cfg.filtros.spam.enabled = i.fields.getTextInputValue("spam_activo").toLowerCase() === "si";
                        cfg.filtros.spam.limite = parseInt(i.fields.getTextInputValue("spam_limite")) || 5;
                        cfg.filtros.spam.segundos = parseInt(i.fields.getTextInputValue("spam_segundos")) || 5;
                    },
                    automod_mayusculas_modal: (i, cfg) => {
                        cfg.filtros.mayusculas.enabled = i.fields.getTextInputValue("mayus_activo").toLowerCase() === "si";
                        cfg.filtros.mayusculas.porcentaje = Math.min(100, Math.max(50, parseInt(i.fields.getTextInputValue("mayus_porcentaje")) || 80));
                    },
                    automod_menciones_modal: (i, cfg) => {
                        cfg.filtros.menciones.enabled = i.fields.getTextInputValue("menciones_activo").toLowerCase() === "si";
                        cfg.filtros.menciones.limite = parseInt(i.fields.getTextInputValue("menciones_limite")) || 3;
                    },
                    automod_emojis_modal: (i, cfg) => {
                        cfg.filtros.emojis.enabled = i.fields.getTextInputValue("emojis_activo").toLowerCase() === "si";
                        cfg.filtros.emojis.limite = parseInt(i.fields.getTextInputValue("emojis_limite")) || 10;
                    },
                    automod_mincar_modal: (i, cfg) => {
                        cfg.filtros.minCaracteres.enabled = i.fields.getTextInputValue("mincar_activo").toLowerCase() === "si";
                        cfg.filtros.minCaracteres.minimo = parseInt(i.fields.getTextInputValue("mincar_minimo")) || 3;
                    },
                    automod_cooldown_modal: (i, cfg) => {
                        cfg.filtros.cooldown.enabled = i.fields.getTextInputValue("cooldown_activo").toLowerCase() === "si";
                        cfg.filtros.cooldown.segundos = parseInt(i.fields.getTextInputValue("cooldown_segundos")) || 5;
                    },
                    automod_accion_modal: (i, cfg) => {
                        const t = i.fields.getTextInputValue("accion_tipo").toLowerCase().trim();
                        if (["borrar", "mute", "warn"].includes(t)) cfg.accion = t;
                        cfg.muteDuracion = parseInt(i.fields.getTextInputValue("accion_mute")) || 5;
                        cfg.warnLimit = parseInt(i.fields.getTextInputValue("accion_warns")) || 3;
                    },
                    automod_logs_modal: (i, cfg) => {
                        const id = i.fields.getTextInputValue("logs_canal").trim();
                        const c = interaction.guild.channels.cache.get(id);
                        if (c) cfg.logChannel = id;
                    }
                };

                if (handlers[i.customId]) {
                    handlers[i.customId](i, cfg);
                    saveConfig(cfg);
                    return i.update({ embeds: [buildSetupEmbed(cfg)], components: [buildMenu()] });
                }
            });

            collector.on("end", () => interaction.editReply({ components: [] }).catch(() => {}));
        }
    }
};