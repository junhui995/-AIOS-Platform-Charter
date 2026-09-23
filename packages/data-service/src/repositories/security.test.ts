import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, grantsAllow } from './security';

describe('security - scrypt password hashing', () => {
  it('round-trips a password through hash and verify', async () => {
    const hash = await hashPassword('admin123');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('admin123', hash)).toBe(true);
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('produces a unique salt per hash', async () => {
    const a = await hashPassword('x');
    const b = await hashPassword('x');
    expect(a).not.toBe(b);
  });

  it('rejects malformed or empty stored values', async () => {
    expect(await verifyPassword('admin123', null)).toBe(false);
    expect(await verifyPassword('admin123', '')).toBe(false);
    expect(await verifyPassword('admin123', 'plaintext')).toBe(false);
  });
});

describe('security - grantsAllow action hierarchy', () => {
  const mk = (module: string, action: string) => [{ roleId: 'r1', module, action, dimensionCode: null }];

  it('ADMIN covers READ and WRITE for the same module', () => {
    expect(grantsAllow(mk('HR', 'ADMIN'), 'HR', 'READ')).toBe(true);
    expect(grantsAllow(mk('HR', 'ADMIN'), 'HR', 'WRITE')).toBe(true);
    expect(grantsAllow(mk('HR', 'ADMIN'), 'HR', 'ADMIN')).toBe(true);
  });

  it('WRITE covers READ but not ADMIN', () => {
    expect(grantsAllow(mk('HR', 'WRITE'), 'HR', 'READ')).toBe(true);
    expect(grantsAllow(mk('HR', 'WRITE'), 'HR', 'WRITE')).toBe(true);
    expect(grantsAllow(mk('HR', 'WRITE'), 'HR', 'ADMIN')).toBe(false);
  });

  it('READ only covers READ', () => {
    expect(grantsAllow(mk('HR', 'READ'), 'HR', 'READ')).toBe(true);
    expect(grantsAllow(mk('HR', 'READ'), 'HR', 'WRITE')).toBe(false);
    expect(grantsAllow(mk('HR', 'READ'), 'HR', 'ADMIN')).toBe(false);
  });

  it('never grants across modules', () => {
    expect(grantsAllow(mk('HR', 'ADMIN'), 'FINANCE', 'READ')).toBe(false);
    expect(grantsAllow(mk('WORKFLOW', 'WRITE'), 'HR', 'WRITE')).toBe(false);
  });

  it('handles empty grant sets', () => {
    expect(grantsAllow([], 'HR', 'READ')).toBe(false);
  });
});