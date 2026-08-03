import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing data
  await prisma.laborContract.deleteMany();
  await prisma.employeePosition.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.position.deleteMany();
  await prisma.department.deleteMany();
  await prisma.orgDimension.deleteMany();

  // 2. Create Dimensions
  const companyDim = await prisma.orgDimension.create({
    data: {
      code: 'COMPANY',
      name: '公司行政架构'
    }
  });

  // 3. Create Departments
  console.log('Creating departments...');
  const hq = await prisma.department.create({
    data: {
      code: 'ORG-001',
      name: '华复保利集团 (总办)',
      headcountLimit: 5,
      dimensionId: companyDim.id
    },
  });

  const hr = await prisma.department.create({
    data: {
      code: 'ORG-002',
      name: '人力资源部',
      parentId: hq.id,
      headcountLimit: 12,
      dimensionId: companyDim.id
    },
  });

  const engineering = await prisma.department.create({
    data: {
      code: 'ORG-003',
      name: '工程管理部',
      parentId: hq.id,
      headcountLimit: 45,
      dimensionId: companyDim.id
    },
  });

  // 4. Create Positions
  const adminPos = await prisma.position.create({
    data: {
      departmentId: hq.id,
      code: 'POS-001',
      name: '系统管理员',
      level: 'M3'
    }
  });

  const hrPos = await prisma.position.create({
    data: {
      departmentId: hr.id,
      code: 'POS-002',
      name: 'HRBP',
      level: 'P6'
    }
  });

  const engPos = await prisma.position.create({
    data: {
      departmentId: engineering.id,
      code: 'POS-003',
      name: '高级工程师',
      level: 'P7'
    }
  });


  // 5. Create Employees
  console.log('Creating employees...');
  const admin = await prisma.employee.create({
    data: {
      code: 'EMP-000',
      name: '管理员',
      phoneNumber: '13800000000',
      email: 'admin@aios.local',
      hireDate: new Date('2020-01-01'),
      status: 'ACTIVE',
      positions: {
        create: {
          positionId: adminPos.id
        }
      }
    },
  });

  const zhangsan = await prisma.employee.create({
    data: {
      code: 'EMP-001',
      name: '张三',
      phoneNumber: '13812345678',
      email: 'zhangsan@aios.local',
      hireDate: new Date('2023-05-12'),
      status: 'PROBATION',
      positions: {
        create: {
          positionId: hrPos.id
        }
      }
    },
  });

  // 6. Create Contracts
  console.log('Creating contracts...');
  await prisma.laborContract.create({
    data: {
      code: 'HT-2026-001',
      employeeId: admin.id,
      signDate: new Date('2026-07-01'),
      startDate: new Date('2026-07-01'),
      endDate: new Date('2027-06-30'),
      status: 'ACTIVE',
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
