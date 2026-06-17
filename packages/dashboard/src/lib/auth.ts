import { createContext, useContext } from "react";
import type {
  Role,
  Permissions,
  UserPermission,
  SiteSummary,
  GroupSummary,
} from "@pulse/shared";
import { fetchPermissions } from "./data";

/**
 * RBAC for UX gating only — NOT a security boundary.
 *
 * The real access boundary is enforced at the edge by Cloudflare Access (which
 * gates who can reach the dashboard at all) combined with a private data repo
 * (so unauthorized users cannot read raw JSON). This module only decides what
 * to *show* a successfully-authenticated user; it never protects data.
 */

export interface AuthState {
  /** Resolved identity email, if known. */
  email: string | null;
  /** Effective role. Defaults to ADMIN when permissions are unavailable. */
  role: Role;
  /** Group ids in scope. `null` = all groups (ADMIN+). */
  groups: string[] | null;
  /** Specific site ids in scope (additive to group scope). `null` = unrestricted. */
  sites: string[] | null;
  /** True when we successfully resolved a permissions entry for the user. */
  identified: boolean;
}

export const ROLE_RANK: Record<Role, number> = {
  VIEWER: 0,
  CLIENT: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  CLIENT: "Client",
  VIEWER: "Viewer",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  SUPER_ADMIN: "Full access to every site, group, and configuration surface.",
  ADMIN: "Full read access to all sites and groups across the workspace.",
  CLIENT: "Scoped to their own groups/sites — sees only their tenant's status.",
  VIEWER: "Read-only access to the sites and groups they are granted.",
};

/** Whether a role is allowed to see admin routes (everything but /status). */
export function canSeeAdmin(role: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK.VIEWER; // all identified roles may view admin UI
}

/** Default state used when no identity/permissions are available. */
export const DEFAULT_AUTH: AuthState = {
  email: null,
  role: "ADMIN",
  groups: null,
  sites: null,
  identified: false,
};

interface CfIdentity {
  email?: string;
  name?: string;
}

/** Try to read the Cloudflare Access identity (email). Tolerates absence. */
export async function fetchCloudflareIdentity(): Promise<string | null> {
  try {
    const res = await fetch("/cdn-cgi/access/get-identity", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as CfIdentity;
    return json.email ?? null;
  } catch {
    return null;
  }
}

const DEV_ROLE = import.meta.env.VITE_DEV_ROLE as Role | undefined;
const DEV_EMAIL = import.meta.env.VITE_DEV_EMAIL as string | undefined;

function findUser(perms: Permissions | null, email: string | null): UserPermission | null {
  if (!perms || !email) return null;
  const lower = email.toLowerCase();
  return perms.users.find((u) => u.email.toLowerCase() === lower) ?? null;
}

/** Resolve the full auth state from identity + permissions (with dev overrides). */
export async function resolveAuth(): Promise<AuthState> {
  const [cfEmail, perms] = await Promise.all([
    fetchCloudflareIdentity(),
    fetchPermissions(),
  ]);

  const email = DEV_EMAIL ?? cfEmail;
  const user = findUser(perms, email);

  // Dev override role wins, then the permissions entry, then the open default.
  if (DEV_ROLE) {
    return {
      email: email ?? DEV_EMAIL ?? null,
      role: DEV_ROLE,
      groups: user?.groups ?? null,
      sites: user?.sites ?? null,
      identified: !!user,
    };
  }

  if (user) {
    const unrestricted = ROLE_RANK[user.role] >= ROLE_RANK.ADMIN;
    return {
      email,
      role: user.role,
      groups: unrestricted ? null : user.groups ?? [],
      sites: unrestricted ? null : user.sites ?? [],
      identified: true,
    };
  }

  // No permissions entry: graceful open ADMIN-equivalent view.
  return { ...DEFAULT_AUTH, email: email ?? null };
}

// ---------------------------------------------------------------------------
// Scope filtering
// ---------------------------------------------------------------------------

/** Is a given site within the user's scope? */
export function siteInScope(
  auth: Pick<AuthState, "groups" | "sites">,
  site: Pick<SiteSummary, "id" | "group">,
): boolean {
  if (auth.groups == null && auth.sites == null) return true; // unrestricted
  const byGroup = auth.groups != null && site.group != null && auth.groups.includes(site.group);
  const bySite = auth.sites != null && auth.sites.includes(site.id);
  // If both scopes are present and empty, nothing is visible.
  if (auth.groups != null && auth.sites != null && auth.groups.length === 0 && auth.sites.length === 0) {
    return false;
  }
  return byGroup || bySite;
}

/** Filter a list of sites down to the user's scope. */
export function scopedSites<T extends Pick<SiteSummary, "id" | "group">>(
  auth: Pick<AuthState, "groups" | "sites">,
  sites: T[],
): T[] {
  if (auth.groups == null && auth.sites == null) return sites;
  return sites.filter((s) => siteInScope(auth, s));
}

/** Filter groups to those the user may see (i.e. that contain a visible site). */
export function scopedGroups(
  auth: Pick<AuthState, "groups" | "sites">,
  groups: GroupSummary[],
  visibleSiteIds: Set<string>,
): GroupSummary[] {
  if (auth.groups == null && auth.sites == null) return groups;
  return groups.filter(
    (g) =>
      (auth.groups != null && auth.groups.includes(g.id)) ||
      g.siteIds.some((id) => visibleSiteIds.has(id)),
  );
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface AuthContextValue extends AuthState {
  ready: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  ...DEFAULT_AUTH,
  ready: false,
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
