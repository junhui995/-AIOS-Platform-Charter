import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';
export * from './repositories/outbox';
export * from './repositories/employee';
export * from './repositories/org';
export * from './repositories/leave';
export * from './repositories/contract';
export * from './repositories/performance';
export * from './repositories/workflow';
export * from './repositories/expense';
export * from './repositories/alert';
export * from './repositories/ruleEngine';
export * from './repositories/registry';
export * from './repositories/monitor';
export * from './repositories/messages';
export * from './repositories/knowledge';
export * from './repositories/security';
export * from './repositories/salary';