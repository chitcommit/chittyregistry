/**
 * AuthorizationService - Manages access control and permissions
 * Integrates with ChittyRegistry to validate resources
 */

export class AuthorizationService {
  constructor(env) {
    this.env = env;
    this.kv = env.AUTH_SESSIONS; // KV namespace for authorizations
  }

  /**
   * Grant access to a resource
   */
  async grantAccess({
    chitty_id,
    resource,
    permissions,
    granted_by,
    granted_at,
  }) {
    const authKey = `auth:${chitty_id}:${resource}`;

    const authorization = {
      chitty_id,
      resource,
      permissions,
      granted_by,
      granted_at,
      active: true,
    };

    // Store authorization
    await this.kv.put(authKey, JSON.stringify(authorization));

    // Add to ChittyID's authorization list
    await this.addToAuthorizationList(chitty_id, resource);

    // Add to resource's access list
    await this.addToResourceAccessList(resource, chitty_id);

    return authorization;
  }

  /**
   * Check if a ChittyID has access to a resource
   */
  async checkAccess(chitty_id, resource, permission) {
    const authKey = `auth:${chitty_id}:${resource}`;
    const authDataStr = await this.kv.get(authKey);

    if (!authDataStr) {
      // Check for wildcard permissions (e.g., admin access)
      return await this.checkWildcardAccess(chitty_id, resource, permission);
    }

    const authData = JSON.parse(authDataStr);

    if (!authData.active) {
      return false;
    }

    // Check if the required permission is in the granted permissions
    if (permission) {
      return (
        authData.permissions.includes(permission) ||
        authData.permissions.includes("*") ||
        authData.permissions.includes("admin")
      );
    }

    return true;
  }

  /**
   * Check if a ChittyID has a specific permission
   */
  async hasPermission(chitty_id, permission) {
    // Check global permissions
    const globalPermsStr = await this.kv.get(`perms:${chitty_id}:global`);

    if (globalPermsStr) {
      const globalPerms = JSON.parse(globalPermsStr);
      if (
        globalPerms.permissions.includes(permission) ||
        globalPerms.permissions.includes("*") ||
        globalPerms.permissions.includes("admin")
      ) {
        return true;
      }
    }

    // Check specific permission grants
    const specificPermStr = await this.kv.get(
      `perms:${chitty_id}:${permission}`,
    );
    return !!specificPermStr;
  }

  /**
   * Revoke access to a resource
   */
  async revokeAccess(chitty_id, resource) {
    const authKey = `auth:${chitty_id}:${resource}`;
    const authDataStr = await this.kv.get(authKey);

    if (!authDataStr) {
      return {
        success: false,
        error: "Authorization not found",
      };
    }

    const authData = JSON.parse(authDataStr);
    authData.active = false;
    authData.revoked_at = new Date().toISOString();

    await this.kv.put(authKey, JSON.stringify(authData));

    return {
      success: true,
      revoked_at: authData.revoked_at,
    };
  }

  /**
   * List all authorizations for a ChittyID
   */
  async listAuthorizations(chitty_id) {
    const authListStr = await this.kv.get(`chitty:${chitty_id}:authorizations`);

    if (!authListStr) {
      return [];
    }

    const resources = JSON.parse(authListStr);
    const authorizations = [];

    for (const resource of resources) {
      const authKey = `auth:${chitty_id}:${resource}`;
      const authDataStr = await this.kv.get(authKey);

      if (authDataStr) {
        const authData = JSON.parse(authDataStr);
        authorizations.push(authData);
      }
    }

    return authorizations;
  }

  /**
   * List all ChittyIDs with access to a resource
   */
  async listResourceAccess(resource) {
    const accessListStr = await this.kv.get(`resource:${resource}:access`);

    if (!accessListStr) {
      return [];
    }

    const chittyIds = JSON.parse(accessListStr);
    const accessList = [];

    for (const chitty_id of chittyIds) {
      const authKey = `auth:${chitty_id}:${resource}`;
      const authDataStr = await this.kv.get(authKey);

      if (authDataStr) {
        const authData = JSON.parse(authDataStr);
        if (authData.active) {
          accessList.push({
            chitty_id,
            permissions: authData.permissions,
            granted_by: authData.granted_by,
            granted_at: authData.granted_at,
          });
        }
      }
    }

    return accessList;
  }

  /**
   * Grant permission (alias for grantGlobalPermission)
   */
  async grantPermission({
    grantor,
    grantee,
    permission,
    resource,
    expires_at,
  }) {
    const authId = `auth_${Date.now()}`;
    const authData = {
      authorization_id: authId,
      grantor,
      grantee,
      permission,
      resource,
      expires_at,
      created_at: new Date().toISOString(),
    };

    // Store the permission grant
    const permsKey = `perms:${grantee}:${permission}`;
    await this.kv.put(permsKey, JSON.stringify(authData));

    return authData;
  }

  /**
   * Grant global permission to a ChittyID
   */
  async grantGlobalPermission(chitty_id, permissions, granted_by) {
    const permsKey = `perms:${chitty_id}:global`;

    const permData = {
      chitty_id,
      permissions: Array.isArray(permissions) ? permissions : [permissions],
      granted_by,
      granted_at: new Date().toISOString(),
    };

    await this.kv.put(permsKey, JSON.stringify(permData));

    return permData;
  }

  /**
   * Helper: Add to ChittyID's authorization list
   */
  async addToAuthorizationList(chitty_id, resource) {
    const listKey = `chitty:${chitty_id}:authorizations`;
    const listStr = await this.kv.get(listKey);
    const list = listStr ? JSON.parse(listStr) : [];

    if (!list.includes(resource)) {
      list.push(resource);
      await this.kv.put(listKey, JSON.stringify(list));
    }
  }

  /**
   * Helper: Add to resource's access list
   */
  async addToResourceAccessList(resource, chitty_id) {
    const listKey = `resource:${resource}:access`;
    const listStr = await this.kv.get(listKey);
    const list = listStr ? JSON.parse(listStr) : [];

    if (!list.includes(chitty_id)) {
      list.push(chitty_id);
      await this.kv.put(listKey, JSON.stringify(list));
    }
  }

  /**
   * Helper: Check wildcard/admin access
   */
  async checkWildcardAccess(chitty_id, resource, permission) {
    // Check if user has admin privileges
    const adminStr = await this.kv.get(`perms:${chitty_id}:global`);

    if (adminStr) {
      const adminData = JSON.parse(adminStr);
      if (
        adminData.permissions.includes("admin") ||
        adminData.permissions.includes("*")
      ) {
        return true;
      }
    }

    // Check for wildcard resource access
    const wildcardKey = `auth:${chitty_id}:*`;
    const wildcardStr = await this.kv.get(wildcardKey);

    if (wildcardStr) {
      const wildcardData = JSON.parse(wildcardStr);
      if (wildcardData.active) {
        if (
          !permission ||
          wildcardData.permissions.includes(permission) ||
          wildcardData.permissions.includes("*")
        ) {
          return true;
        }
      }
    }

    return false;
  }
}
