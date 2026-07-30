import { prisma } from '@aios/data-service';

export interface ToolDefinition {
    name: string;
    description: string;
    schema: Record<string, any>;
    execute: (args: any) => Promise<any>;
}

export const tools: Record<string, ToolDefinition> = {
    getEmployeeIdByName: {
        name: 'getEmployeeIdByName',
        description: 'Looks up an employee by their full name and returns their ID and Department.',
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
                include: {
                  positions: {
                    include: {
                      position: {
                        include: {
                          department: true
                        }
                      }
                    }
                  }
                }
            });
            if (emp) {
                // Find primary position's department name, if any
                const primaryPos = emp.positions.find(p => p.isPrimary);
                const deptName = primaryPos?.position?.department?.name || 'Unknown';
                return { id: emp.id, code: emp.code, department: deptName };
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
                employeeId: { type: 'string', description: 'The unique ID of the employee' }
            },
            required: ['employeeId']
        },
        execute: async (args: { employeeId: string }) => {
            const balance = await prisma.leaveBalance.findUnique({
                where: { employeeId: args.employeeId }
            });
            if (balance) {
                return {
                    annualRemaining: balance.annualTotal - balance.annualUsed,
                    sickRemaining: balance.sickTotal - balance.sickUsed
                };
            }
            // If no balance record, assume default or 0
            return { error: 'Leave balance not initialized for this employee.' };
        }
    },

    submitLeaveRequest: {
        name: 'submitLeaveRequest',
        description: 'Submits a formal leave request for an employee. Automatically creates a record in database.',
        schema: {
            type: 'object',
            properties: {
                employeeId: { type: 'string' },
                leaveType: { type: 'string', enum: ['ANNUAL', 'SICK', 'UNPAID', 'MATERNITY'] },
                startDate: { type: 'string', description: 'ISO Date string e.g. 2026-08-01' },
                endDate: { type: 'string', description: 'ISO Date string' },
                reason: { type: 'string' },
                aiAnalysis: { type: 'string', description: 'AI generated justification based on rules' }
            },
            required: ['employeeId', 'leaveType', 'startDate', 'endDate']
        },
        execute: async (args: any) => {
            const request = await prisma.leaveRequest.create({
                data: {
                    employeeId: args.employeeId,
                    leaveType: args.leaveType,
                    startDate: new Date(args.startDate),
                    endDate: new Date(args.endDate),
                    reason: args.reason,
                    aiAnalysis: args.aiAnalysis,
                    status: 'PENDING'
                }
            });
            return { success: true, requestId: request.id, status: request.status };
        }
    },

    requestFinanceApproval: {
        name: 'requestFinanceApproval',
        description: 'Triggers a human workflow approval in the Finance Domain.',
        schema: {
            type: 'object',
            properties: {
                targetId: { type: 'string', description: 'The entity ID (e.g. expense ID) that needs approval' },
                contextMsg: { type: 'string', description: 'Explanation for why this was routed to finance' }
            },
            required: ['targetId', 'contextMsg']
        },
        execute: async (args: any) => {
            // In a real system, this would call Workflow Center API
            console.log(`[Workflow Mock] Requesting Finance Approval for ${args.targetId}: ${args.contextMsg}`);
            return { success: true, workflowStatus: 'PENDING_FINANCE_APPROVAL' };
        }
    }
};
