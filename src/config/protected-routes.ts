/**
 * Protected Routes Configuration
 * Defines which routes require authentication and which roles can access them
 */

export type UserRole = "client" | "pro" | "admin";

export interface ProtectedRoute {
  path: string;
  roles?: UserRole[];
  requiresAuth: boolean;
}

export const PROTECTED_ROUTES: ProtectedRoute[] = [
  {
    path: "/references",
    roles: ["client", "admin"],
    requiresAuth: true,
  },
  {
    path: "/admin",
    roles: ["admin"],
    requiresAuth: true,
  },
  {
    path: "/pro",
    roles: ["pro", "admin"],
    requiresAuth: true,
  },
];

/**
 * Get all protected paths for middleware matching
 */
export function getProtectedPaths(): string[] {
  return PROTECTED_ROUTES.map((route) => route.path);
}

/**
 * Check if a route is accessible by a given role
 */
export function canAccessRoute(
  path: string,
  userRole: UserRole | "guest"
): boolean {
  const route = PROTECTED_ROUTES.find((r) => path.startsWith(r.path));

  if (!route) return true; // Public route

  if (!route.requiresAuth && userRole === "guest") return true;
  if (!route.roles) return route.requiresAuth && userRole !== "guest";

  return route.roles.includes(userRole as UserRole);
}
