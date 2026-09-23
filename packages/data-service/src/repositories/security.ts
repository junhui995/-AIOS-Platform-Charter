import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { prisma } from '../index';

const scryptAsync = promisify(scrypt) as (pw: string, salt: string, keylen: number) => Promise<Buffer>;

export const SECURITY_MODULES = ['HR', 'ORG', 'FINANCE', 'WORKFLOW', 'MONITOR', 'KNOWLEDGE', 'MESSAGES', 'SYSTEM'] as const;
export type SecurityModule = (typeof SECURITY_MODULES)[number];

export const SECURITY_ACTIONS = ['READ', 'WRITE', 'ADMIN'] as const;
export type SecurityAction = (typeof SECURITY_ACTIONS)[number];

const DEFAULT_PASSWORD = 'admin123';
const SYSTEM_ADMIN_ROLE = '系统管理员';

export interface PermissionGrant {
  roleId: string;
  module: string;
  action: string;
  dimensionCode: string | null;
}

/**
 * scrypt password hashing (no external deps). Format: scrypt$<salt>$<hex hash>.
 * Constant-time compare via timingSafeEqual.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(plain, salt, 64);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(plain: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const match = /^scrypt\$([0-9a-f]+)\$([0-9a-f]+)$/.exec(stored);
  if (!match) return false;
  const [, salt, expectedHex] = match;
  const derived = await scryptAsync(plain, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

/**
 * Login identity lookup: accepts Employee code (EMP-000) or email, returns the
 * employee only when status is ACTIVE. Never returns passwordHash.
 */
export async function authenticate(login: string, password: string) {
  const normalized = login.trim().toLowerCase();
  const employee = await prisma.employee.findFirst({
    where: {
      OR: [
        { code: { equals: login.trim(), mode: 'insensitive' } },
        { email: { equals: normalized } },
      ],
    },
    include: { role: { include: { permissions: true } } },
  });
  if (!employee) return null;
  if (employee.status !== 'ACTIVE' && employee.status !== 'PROBATION') return null;
  const ok = await verifyPassword(password, employee.passwordHash);
  if (!ok) return null;
  const { passwordHash: _ignored, ...safe } = employee;
  return safe;
}

/** Effective grants for an employee. Action hierarchy (ADMIN>WRITE>READ) is
 * applied at check time by grantsAllow; here we only surface raw grants,
 * plus full coverage for the built-in super admin role. */
export async function permissionsOf(employeeId: string): Promise<PermissionGrant[]> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { role: { include: { permissions: { include: { dimension: true } } } } },
  });
  if (!employee?.role) return [];
  const isSuper = employee.role.name === SYSTEM_ADMIN_ROLE;
  const grants: PermissionGrant[] = employee.role.permissions.map((p) => ({
    roleId: p.roleId,
    module: p.module,
    action: p.action,
    dimensionCode: p.dimension?.code ?? null,
  }));
  if (isSuper) {
    for (const module of SECURITY_MODULES) {
      grants.push({ roleId: employee.role.id, module, action: 'ADMIN', dimensionCode: 'COMPANY_DIMENSION' });
    }
  }
  const seen = new Set<string>();
  return grants.filter((g) => {
    const key = `${g.module}:${g.action}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * roleId + roleName only, used to attach to the session token without pulling
 * the full permission rows on every request.
 */
export async function roleOf(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { role: true },
  });
  if (!employee?.role) return null;
  return { roleId: employee.role.id, roleName: employee.role.name };
}

/** Test whether a set of grants covers module:action (action hierarchy applied). */
export function grantsAllow(grants: PermissionGrant[], module: string, action: SecurityAction): boolean {
  return grants.some((g) => {
    if (g.module !== module) return false;
    if (g.action === 'ADMIN') return true;
    if (action === 'READ' && (g.action === 'WRITE' || g.action === 'ADMIN')) return true;
    return g.action === action;
  });
}

export async function hasPermission(employeeId: string, module: string, action: SecurityAction): Promise<boolean> {
  const grants = await permissionsOf(employeeId);
  return grantsAllow(grants, module, action);
}

// ---------------------------------------------------------------------------
// Seed: roles, permission matrix, dimensions, default passwords (idempotent)
// ---------------------------------------------------------------------------

const SEED_MATRIX: Array<{ role: string; description: string; perms: Array<[string, SecurityAction]> }> = [
  {
    role: SYSTEM_ADMIN_ROLE,
    description: '全模块读写与管理，内置不可删除。',
    perms: [
      ['HR', 'ADMIN'], ['ORG', 'ADMIN'], ['FINANCE', 'ADMIN'], ['WORKFLOW', 'ADMIN'],
      ['MONITOR', 'ADMIN'], ['KNOWLEDGE', 'ADMIN'], ['MESSAGES', 'ADMIN'], ['SYSTEM', 'ADMIN'],
    ],
  },
  {
    role: 'HRBP',
    description: '人事业务读写与组织数据维护。',
    perms: [
      ['HR', 'WRITE'], ['ORG', 'WRITE'], ['FINANCE', 'READ'], ['WORKFLOW', 'WRITE'],
      ['MONITOR', 'READ'], ['KNOWLEDGE', 'WRITE'], ['SYSTEM', 'READ'],
    ],
  },
  {
    role: '部门主管',
    description: '本部门人事与流程审批。',
    perms: [
      ['HR', 'READ'], ['ORG', 'READ'], ['FINANCE', 'READ'], ['WORKFLOW', 'WRITE'],
      ['MONITOR', 'READ'], ['KNOWLEDGE', 'READ'],
    ],
  },
  {
    role: '员工',
    description: '自助服务：请假/报销/消息/知识库/查看本人任务。',
    perms: [
      ['HR', 'READ'], ['KNOWLEDGE', 'READ'], ['MESSAGES', 'READ'], ['FINANCE', 'READ'], ['WORKFLOW', 'READ'],
    ],
  },
];

export async function seedSecurity(): Promise<{ roles: string[]; passwords: number }> {
  const company = await prisma.orgDimension.upsert({
    where: { code: 'COMPANY_DIMENSION' },
    update: { name: '全公司维度' },
    create: { code: 'COMPANY_DIMENSION', name: '全公司维度', description: '全公司数据范围' },
  });

  const roleNames: string[] = [];
  for (const spec of SEED_MATRIX) {
    const role = await prisma.role.upsert({
      where: { name: spec.role },
      update: { description: spec.description },
      create: { name: spec.role, description: spec.description },
    });
    roleNames.push(role.name);

    const existing = await prisma.rolePermission.findMany({ where: { roleId: role.id } });
    const existingKeys = new Set(existing.map((p) => `${p.module}:${p.action}`));
    for (const [module, action] of spec.perms) {
      const key = `${module}:${action}`;
      if (existingKeys.has(key)) continue;
      await prisma.rolePermission.create({
        data: { roleId: role.id, module, action, dimensionId: company.id },
      });
    }
  }

  // Initial counter for seeding passwordHash: fill any blank ACTIVE/PROBATION employee.
  const plainEmployees = await prisma.employee.findMany({
    where: { passwordHash: null, status: { in: ['ACTIVE', 'PROBATION'] } },
  });
  for (const emp of plainEmployees) {
    await prisma.employee.update({
      where: { id: emp.id },
      data: { passwordHash: await hashPassword(DEFAULT_PASSWORD) },
    });
  }

  // Demo bootstrap role bindings (idempotent): EMP-000=超级管理员，EMP-002=员工，
  // 其余 ACTIVE/PROBATION=部门主管，保证演示审批链路可用。生产环境须由权限管理员显式分配。
  const superRole = await prisma.role.findUnique({ where: { name: SYSTEM_ADMIN_ROLE } });
  const staffRole = await prisma.role.findUnique({ where: { name: '员工' } });
  const managerRole = await prisma.role.findUnique({ where: { name: '部门主管' } });
  const bindees = await prisma.employee.findMany({
    where: { roleId: null, status: { in: ['ACTIVE', 'PROBATION'] } },
  });
  for (const emp of bindees) {
    let roleId: string | null = null;
    if (superRole && emp.code === 'EMP-000') roleId = superRole.id;
    else if (staffRole && emp.code === 'EMP-002') roleId = staffRole.id;
    else if (managerRole) roleId = managerRole.id;
    if (roleId) {
      await prisma.employee.update({ where: { id: emp.id }, data: { roleId } });
    }
  }

  return { roles: roleNames, passwords: plainEmployees.length };
}

export const securitySeedPassword = DEFAULT_PASSWORD;