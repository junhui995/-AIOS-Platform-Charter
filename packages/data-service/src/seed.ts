import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing data (optional, but good for idempotency during dev)
  await prisma.contract.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();

  // 2. Create Departments
  console.log('Creating departments...');
  const hq = await prisma.department.create({
    data: {
      code: 'ORG-001',
      name: '华复保利集团 (总办)',
      headcountLimit: 5,
    },
  });

  const hr = await prisma.department.create({
    data: {
      code: 'ORG-002',
      name: '人力资源部',
      parentId: hq.id,
      headcountLimit: 12,
    },
  });

  const engineering = await prisma.department.create({
    data: {
      code: 'ORG-003',
      name: '工程管理部',
      parentId: hq.id,
      headcountLimit: 45,
    },
  });

  // 3. Create Employees
  console.log('Creating employees...');
  const admin = await prisma.employee.create({
    data: {
      code: 'EMP-000',
      name: '管理员',
      phoneNumber: '13800000000',
      email: 'admin@aios.local',
      departmentId: hq.id,
      positionId: 'POS-001',
      hireDate: new Date('2020-01-01'),
      status: 'ACTIVE',
    },
  });

  const zhangsan = await prisma.employee.create({
    data: {
      code: 'EMP-001',
      name: '张三',
      phoneNumber: '13812345678',
      email: 'zhangsan@aios.local',
      departmentId: hr.id,
      positionId: 'POS-002',
      hireDate: new Date('2023-05-12'),
      status: 'PROBATION',
    },
  });

  const lisi = await prisma.employee.create({
    data: {
      code: 'EMP-002',
      name: '李四',
      phoneNumber: '13987654321',
      email: 'lisi@aios.local',
      departmentId: engineering.id,
      positionId: 'POS-003',
      hireDate: new Date('2021-08-01'),
      status: 'ACTIVE',
    },
  });

  // 4. Create Contracts
  console.log('Creating contracts...');
  await prisma.contract.create({
    data: {
      code: 'HT-2026-001',
      counterpartyId: 'CUST-001',
      amount: 120000.00,
      signDate: new Date('2026-07-01'),
      startDate: new Date('2026-07-01'),
      endDate: new Date('2027-06-30'),
      status: 'ACTIVE',
      ownerId: admin.id,
    },
  });

  await prisma.contract.create({
    data: {
      code: 'HT-2026-002',
      counterpartyId: 'CUST-002',
      amount: 850000.00,
      signDate: new Date('2025-08-15'),
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-08-31'),
      status: 'ACTIVE', // Mock warning state logic depends on UI/Date calculation
      ownerId: lisi.id,
    },
  });

  console.log('✅ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
