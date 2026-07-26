const path = require("path");
const catarseConfig = require(path.resolve(__dirname, "..", "data", "catarseData", "catarse-config.json"));
const catarseRepo = require("../repositories/CatarseRepository.js");

function getRoleConfigs() {
    if (Array.isArray(catarseConfig)) return catarseConfig;
    if (Array.isArray(catarseConfig.cargos)) return catarseConfig.cargos;
    return [];
}

function getSupportCost() {
    const raw = catarseConfig && typeof catarseConfig === "object" ? catarseConfig.Custo_Apoio : null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function parseCurrencyLike(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const raw = String(value || "").replace(/R\$/gi, "").trim();
    const hasComma = raw.includes(",");
    const cleaned = hasComma
        ? raw.replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, "")
        : raw.replace(/[^0-9.-]/g, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
}

function getTargetRoleConfig(months, roleConfigs) {
    const validRoles = roleConfigs
        .filter(item => item && item.cargo_id && Number.isFinite(Number(item.quantidade_meses)))
        .map(item => ({ ...item, quantidade_meses: Number(item.quantidade_meses) }))
        .sort((a, b) => b.quantidade_meses - a.quantidade_meses);
    return validRoles.find(item => Number(months) >= item.quantidade_meses) || null;
}

function getManagedRoleIds() {
    return getRoleConfigs().map(item => item.cargo_id).filter(Boolean);
}

async function getConnectionStats(email) {
    const normalizedEmail = normalizeEmail(email);
    const links = await catarseRepo.listarEmails();
    const subscribers = await catarseRepo.listarAssinantes();
    const supportCost = getSupportCost();

    const usedConnections = links.filter(item => normalizeEmail(item.email) === normalizedEmail).length;
    const subscriber = subscribers.find(item => normalizeEmail(item.email) === normalizedEmail);
    const pagamentoMensal = Number(subscriber && subscriber.pagamentoMensal);
    const maxConnections = supportCost > 0 && Number.isFinite(pagamentoMensal) && pagamentoMensal > 0 ? 1 : 0;

    return { subscriber, usedConnections, maxConnections, pagamentoMensal };
}

async function removeManagedCatarseRoles(client, userId, guildId) {
    if (!guildId) throw new Error("guildId é obrigatório.");

    const guild = await client.guilds.fetch(guildId);
    const managedRoleIds = getManagedRoleIds();

    if (managedRoleIds.length === 0) return { memberFound: true, removedRoleIds: [] };

    let member;
    try {
        member = await guild.members.fetch(userId);
    } catch {
        return { memberFound: false, removedRoleIds: [] };
    }

    const rolesToRemove = managedRoleIds.filter(roleId => member.roles.cache.has(roleId));
    if (rolesToRemove.length > 0) await member.roles.remove(rolesToRemove);

    return { memberFound: true, removedRoleIds: rolesToRemove };
}

async function syncCatarseRoles(client, guildId) {
    if (!guildId) throw new Error("guildId é obrigatório.");

    const guild = await client.guilds.fetch(guildId);
    const linkedEmails = await catarseRepo.listarEmails();
    const subscribers = await catarseRepo.listarAssinantes();
    const guildRoleIds = new Set(guild.roles.cache.map(role => role.id));

    const subscriberByEmail = new Map(subscribers.map(item => [normalizeEmail(item.email), item]));
    const managedRoleIds = getManagedRoleIds();
    const roleConfigs = getRoleConfigs();
    const missingRoles = roleConfigs
        .filter(item => item && item.cargo_id && !guildRoleIds.has(item.cargo_id))
        .map(item => ({ cargo_id: item.cargo_id, cargo_nome: item.cargo_nome || item.cargo_id, quantidade_meses: Number(item.quantidade_meses) }));
    const missingRoleIds = new Set(missingRoles.map(item => item.cargo_id));

    const summary = {
        processed: 0, matched: 0, roleAssigned: 0, roleRemovedOnly: 0,
        userNotFound: 0, noEmailMatch: 0, noEligibleRole: 0,
        missingRoles, errors: [],
    };

    for (const link of linkedEmails) {
        summary.processed++;

        const userId = String(link.userId || "").trim();
        const email = normalizeEmail(link.email);
        if (!userId || !email) { summary.noEmailMatch++; continue; }

        const subscriber = subscriberByEmail.get(email);
        if (!subscriber) { summary.noEmailMatch++; continue; }

        summary.matched++;

        const months = Number(subscriber.mesesAssinante);
        const targetRole = getTargetRoleConfig(months, roleConfigs);

        let member;
        try {
            member = await guild.members.fetch(userId);
        } catch {
            summary.userNotFound++;
            summary.errors.push({ userId, email, message: "Membro não encontrado." });
            continue;
        }

        try {
            const rolesToRemove = managedRoleIds.filter(roleId => {
                if (missingRoleIds.has(roleId)) return false;
                return roleId !== (targetRole && targetRole.cargo_id);
            });

            if (rolesToRemove.length > 0) await member.roles.remove(rolesToRemove);

            if (!targetRole || missingRoleIds.has(targetRole.cargo_id)) {
                summary.noEligibleRole++;
                if (targetRole && missingRoleIds.has(targetRole.cargo_id)) {
                    summary.errors.push({ userId, email, message: `Cargo não encontrado: ${targetRole.cargo_nome} (${targetRole.cargo_id})` });
                }
                summary.roleRemovedOnly++;
                continue;
            }

            if (!member.roles.cache.has(targetRole.cargo_id)) await member.roles.add(targetRole.cargo_id);
            summary.roleAssigned++;
        } catch (error) {
            summary.errors.push({ userId, email, message: error instanceof Error ? error.message : "Erro ao atualizar cargo." });
        }
    }

    return summary;
}

module.exports = {
    getRoleConfigs, getSupportCost, normalizeEmail, isValidEmail,
    parseCurrencyLike, getTargetRoleConfig, getManagedRoleIds,
    getConnectionStats, removeManagedCatarseRoles, syncCatarseRoles,
};
