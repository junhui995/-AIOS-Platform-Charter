/**
 * Entity / field registry for the monitoring rule designer.
 * Each target maps to a domain table with typed fields the rule DSL can read
 * (`@fieldName` or `@object.field`) and the fetcher used when running a rule.
 */

export type FieldType = 'number' | 'string' | 'date' | 'boolean';

export interface RegistryField {
  name: string;
  label: string;
  type: FieldType;
  derived?: boolean;
}

export interface RegistryEntity {
  key: string;
  label: string;
  description?: string;
  fields: RegistryField[];
}

function f(name: string, label: string, type: FieldType, derived = false): RegistryField {
  return { name, label, type, derived };
}

export const entityRegistry: RegistryEntity[] = [
  {
    key: 'laborContract',
    label: '劳动合同',
    description: '有效的劳动合同记录',
    fields: [
      f('code', '合同编号', 'string'),
      f('employeeName', '员工姓名', 'string'),
      f('employeeCode', '员工工号', 'string'),
      f('status', '合同状态', 'string'),
      f('startDate', '生效日期', 'date'),
      f('endDate', '到期日期', 'date'),
      f('daysRemaining', '剩余天数', 'number', true),
    ],
  },
  {
    key: 'employee',
    label: '员工花名册',
    description: '在职/试用/离职员工',
    fields: [
      f('name', '姓名', 'string'),
      f('code', '工号', 'string'),
      f('status', '状态', 'string'),
      f('hireDate', '入职日期', 'date'),
      f('probationEndDate', '试用期结束(6个月)', 'date', true),
      f('daysToProbationEnd', '距试用期结束天数', 'number', true),
    ],
  },
  {
    key: 'leaveRequest',
    label: '请假申请',
    description: '请假单（含待审/已批）',
    fields: [
      f('employeeName', '员工姓名', 'string'),
      f('employeeCode', '工号', 'string'),
      f('leaveType', '假别', 'string'),
      f('startDate', '开始日期', 'date'),
      f('endDate', '结束日期', 'date'),
      f('reason', '事由', 'string'),
      f('status', '状态', 'string'),
      f('days', '请假天数', 'number', true),
    ],
  },
  {
    key: 'expense',
    label: '报销单',
    description: '员工报销记录',
    fields: [
      f('applicantName', '申请人', 'string'),
      f('applicantCode', '申请人工号', 'string'),
      f('amount', '金额', 'number'),
      f('category', '报销类别', 'string'),
      f('status', '状态', 'string'),
      f('reason', '事由', 'string'),
      f('occurredOn', '票据日期', 'date'),
      f('createdAt', '提交时间', 'date'),
    ],
  },
  {
    key: 'dailyAttendance',
    label: '日考勤',
    description: '每日考勤记录',
    fields: [
      f('employeeName', '员工姓名', 'string'),
      f('employeeCode', '工号', 'string'),
      f('date', '考勤日期', 'date'),
      f('status', '考勤状态', 'string'),
      f('exceptionMemo', '异常说明', 'string'),
    ],
  },
];

export function getRegistryEntity(key: string): RegistryEntity | undefined {
  return entityRegistry.find((e) => e.key === key);
}