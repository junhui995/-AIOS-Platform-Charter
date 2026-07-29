import { prisma, db as mockDb } from '@aios/data-service';

export interface ToolDefinition {
    name: string;
    description: string;
    schema: Record<string, any>;
    execute: (args: any) => Promise<any> | any;
}

export const Tools: Record<string, ToolDefinition> = {
    // --- Legacy Expense Mock Tools ---
    createExpenseOrder: {
        name: 'createExpenseOrder',
        description: 'Creates a new expense record in the system. Returns the new expense ID.',
        schema: {
            type: 'object',
            properties: {
                employeeId: { type: 'string', description: 'The ID of the employee (e.g. E001)' },
                amount: { type: 'number', description: 'The amount to expense' },
                reason: { type: 'string', description: 'The reason for the expense' }
            },
            required: ['employeeId', 'amount', 'reason']
        },
        execute: async (args: { employeeId: string; amount: number; reason: string }) => {
            const exp = mockDb.createExpense(args.employeeId, args.amount, args.reason);
            return { success: true, expenseId: exp.id, status: exp.status };
        }
    },

    // --- EHR Active Tools (Connected to Real Prisma DB) ---
    getEmployeeIdByName: {
        name: 'getEmployeeIdByName',
        description: 'Looks up an employee ID given their name. Useful before checking their leave balances or payroll.',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'The name of the employee (e.g. 张三, Alice)' }
            },
            required: ['name']
        },
        execute: async (args: { name: string }) => {
            const emp = await prisma.employee.findFirst({
                where: { name: args.name },
                include: { department: true }
            });
            if (emp) {
                return { id: emp.id, code: emp.code, department: emp.department?.name || 'Unknown' };
            }
            return { error: `Employee ${args.name} not found.` };
        }
    },

    checkLeaveBalance: {
        name: 'checkLeaveBalance',
        description: 'Checks the remaining annual and sick leave balances for an employee.',
        schema: {
            type: 'object',
            properties: {
                employeeId: { type: 'string', description: 'The Prisma ID of the employee.' }
            },
            required: ['employeeId']
        },
        execute: async (args: { employeeId: string }) => {
            const balance = await prisma.leaveBalance.findUnique({
                where: { employeeId: args.employeeId }
            });
            if (!balance) return { error: `Leave balance not initialized for employee ${args.employeeId}` };

            return {
                annualRemaining: balance.annualTotal - balance.annualUsed,
                sickRemaining: balance.sickTotal - balance.sickUsed
            };
        }
    },

    submitLeaveRequest: {
        name: 'submitLeaveRequest',
        description: 'Submits a leave request on behalf of an employee. Calculates dates and records AI reasoning.',
        schema: {
            type: 'object',
            properties: {
                employeeId: { type: 'string', description: 'The Prisma ID of the employee.' },
                leaveType: { type: 'string', description: 'ANNUAL, SICK, UNPAID, or MATERNITY' },
                startDate: { type: 'string', description: 'ISO string of the start date' },
                endDate: { type: 'string', description: 'ISO string of the end date' },
                reason: { type: 'string', description: 'Reason for leave' },
                aiReasoning: { type: 'string', description: 'The AIs justification for approving/flagging this.' }
            },
            required: ['employeeId', 'leaveType', 'startDate', 'endDate']
        },
        execute: async (args: { employeeId: string, leaveType: string, startDate: string, endDate: string, reason?: string, aiReasoning?: string }) => {
            const request = await prisma.leaveRequest.create({
                data: {
                    employeeId: args.employeeId,
                    leaveType: args.leaveType,
                    startDate: new Date(args.startDate),
                    endDate: new Date(args.endDate),
                    reason: args.reason,
                    aiAnalysis: args.aiReasoning,
                    status: 'PENDING'
                }
            });
            return { success: true, requestId: request.id, status: request.status };
        }
    }
};
