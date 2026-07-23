"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tools = void 0;
const data_service_1 = require("@aios/data-service");
exports.Tools = {
    getEmployeeIdByName: {
        name: 'getEmployeeIdByName',
        description: 'Looks up an employee ID given their name. Useful before creating expenses if you only have a name.',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'The name of the employee (e.g. Alice, Bob)' }
            },
            required: ['name']
        },
        execute: (args) => {
            const emp = data_service_1.db.getEmployeeByName(args.name);
            if (!emp)
                return { error: `Employee ${args.name} not found.` };
            return { id: emp.id, department: emp.department };
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
        execute: (args) => {
            const exp = data_service_1.db.createExpense(args.employeeId, args.amount, args.reason);
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
        execute: (args) => {
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
        execute: (args) => {
            const success = data_service_1.db.updateExpenseStatus(args.expenseId, 'Approved');
            if (success) {
                return { success: true, message: `Expense ${args.expenseId} has been auto-approved.` };
            }
            else {
                return { error: `Expense ${args.expenseId} not found.` };
            }
        }
    }
};
//# sourceMappingURL=index.js.map