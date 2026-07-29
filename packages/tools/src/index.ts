import { prisma, db as mockDb } from '@aios/data-service';

export interface ToolDefinition {
    name: string;
    description: string;
    schema: Record<string, any>;
    execute: (args: any) => Promise<any> | any;
}

export const Tools: Record<string, ToolDefinition> = {
    getEmployeeIdByName: {
        name: 'getEmployeeIdByName',
        description: 'Looks up an employee ID given their name. Useful before creating expenses if you only have a name.',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'The name of the employee (e.g. 张三, Alice)' }
            },
            required: ['name']
        },
        execute: async (args: { name: string }) => {
            // First check the real DB
            const emp = await prisma.employee.findFirst({
                where: { name: args.name },
                include: { department: true }
            });
            if (emp) {
                return { id: emp.id, code: emp.code, department: emp.department?.name || 'Unknown' };
            }
            // Fallback to Mock DB for legacy tests
            const mockEmp = mockDb.getEmployeeByName(args.name);
            if (!mockEmp) return { error: `Employee ${args.name} not found.` };
            return { id: mockEmp.id, department: mockEmp.department, source: 'mock' };
        }
    },
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
            // In a real app we'd create this in a real Expense table in Prisma
            // For now, we'll keep using the mock DB to store expenses until the expense schema is added to Prisma
            const exp = mockDb.createExpense(args.employeeId, args.amount, args.reason);
            return { success: true, expenseId: exp.id, status: exp.status };
        }
    },
    requestFinanceApproval: {
        name: 'requestFinanceApproval',
        description: 'Requests manual approval from a Finance Manager for an expense. Used if an expense violates automatic policy limits.',
        schema: {
            type: 'object',
            properties: {
                expenseId: { type: 'string', description: 'The ID of the expense' },
                reason: { type: 'string', description: 'Why this requires manual approval' }
            },
            required: ['expenseId', 'reason']
        },
        execute: (args: { expenseId: string; reason: string }) => {
            // Mocking a workflow trigger
            console.log(`[Workflow] Triggered manual approval workflow for Expense ${args.expenseId}. Reason: ${args.reason}`);
            return { success: true, message: `Approval requested for ${args.expenseId}. It is currently Pending.` };
        }
    },
    autoApproveExpense: {
        name: 'autoApproveExpense',
        description: 'Automatically approves an expense if it passes all policy constraints.',
        schema: {
            type: 'object',
            properties: {
                expenseId: { type: 'string', description: 'The ID of the expense' }
            },
            required: ['expenseId']
        },
        execute: (args: { expenseId: string }) => {
            const success = mockDb.updateExpenseStatus(args.expenseId, 'Approved');
            if (success) {
                return { success: true, message: `Expense ${args.expenseId} has been auto-approved.` };
            } else {
                return { error: `Expense ${args.expenseId} not found.` };
            }
        }
    }
};
