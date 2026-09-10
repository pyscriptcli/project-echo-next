export const OWNER_USERNAME = "admin";
export function isFormsOwner(user?: { username?: string | null; email?: string | null } | null) { const e=String(user?.email||'').trim().toLowerCase(); return e === "admin@primephilippines.com"; }
