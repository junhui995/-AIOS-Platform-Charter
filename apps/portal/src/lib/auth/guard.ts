import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { hasPermission, type SecurityAction } from '@aios/data-service';
import { authOptions } from './authOptions';

export interface AuthContext {
  authenticated: boolean;
  employeeId: string | null;
  roleName: string | null;
  bypass: boolean;
}

const DEV_BYPASS = process.env.AUTH_DEV_BYPASS === '1';

export async function getAuthContext(): Promise<AuthContext> {
  if (DEV_BYPASS) return { authenticated: true, employeeId: 'SYSTEM', roleName: '系统管理员', bypass: true };
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string } | null | undefined;
  const id = sessionUser?.id ?? null;
  return {
    authenticated: Boolean(id),
    employeeId: id,
    roleName: (session?.user as { role?: string | null })?.role ?? null,
    bypass: false,
  };
}

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx.authenticated) throw new AuthError('未登录或会话已过期', 401);
  return ctx;
}

export async function requirePermission(module: string, action: SecurityAction): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (ctx.bypass) return ctx;
  const ok = await hasPermission(ctx.employeeId!, module, action);
  if (!ok) throw new AuthError(`无权限执行 ${module}:${action}`, 403);
  return ctx;
}

/** Grant needed on at least one (module, action) pair. */
export async function requireAnyPermission(pairs: Array<[string, SecurityAction]>): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (ctx.bypass) return ctx;
  for (const [module, action] of pairs) {
    if (await hasPermission(ctx.employeeId!, module, action)) return ctx;
  }
  throw new AuthError(`无权限执行（需任一 ${pairs.map(([m, a]) => `${m}:${a}`).join(' / ')}）`, 403);
}

/**
 * IDOR guard: the caller may access the resource only if it belongs to them,
 * or they hold admin/write on the module.
 */
export async function requireOwnerOrAdmin(resourceOwnerEmployeeId: string | null, module: string): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (ctx.bypass) return ctx;
  if (resourceOwnerEmployeeId && resourceOwnerEmployeeId === ctx.employeeId) return ctx;
  const admin = await hasPermission(ctx.employeeId!, module, 'ADMIN');
  const write = await hasPermission(ctx.employeeId!, module, 'WRITE');
  if (admin || write) return ctx;
  throw new AuthError('只能访问自己的数据', 403);
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function handleRouteError(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return NextResponse.json(
    { error: err instanceof Error ? err.message : 'Request failed' },
    { status: 500 },
  );
}