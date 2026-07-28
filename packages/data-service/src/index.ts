import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';

/**
 * Mock Data Service for AIOS MVP
 * Handles mock database operations.
 */

export interface EmployeeMock {
    id: string;
    name: string;
    department: string;
}

export interface ExpenseMock {
    id: string;
    employeeId: string;
    amount: number;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
}

class DataService {
    private employees: EmployeeMock[] = [
        { id: 'E001', name: 'Alice', department: 'Sales' },
        { id: 'E002', name: 'Bob', department: 'Engineering' }
    ];

    private expenses: ExpenseMock[] = [];
    private expenseIdCounter = 1;

    public getEmployee(id: string): EmployeeMock | undefined {
        return this.employees.find(e => e.id === id);
    }

    public getEmployeeByName(name: string): EmployeeMock | undefined {
        return this.employees.find(e => e.name.toLowerCase() === name.toLowerCase());
    }

    public createExpense(employeeId: string, amount: number, reason: string): ExpenseMock {
        const expense: ExpenseMock = {
            id: `EXP-${this.expenseIdCounter++}`,
            employeeId,
            amount,
            reason,
            status: 'Pending'
        };
        this.expenses.push(expense);
        return expense;
    }

    public getExpense(id: string): ExpenseMock | undefined {
        return this.expenses.find(e => e.id === id);
    }

    public updateExpenseStatus(id: string, status: 'Pending' | 'Approved' | 'Rejected'): boolean {
        const expense = this.getExpense(id);
        if (expense) {
            expense.status = status;
            return true;
        }
        return false;
    }

    public getAllExpenses(): ExpenseMock[] {
        return this.expenses;
    }
}

// Export a singleton instance for the mock DB to not break backwards compatibility
export const db = new DataService();
