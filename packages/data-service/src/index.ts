/**
 * Mock Data Service for AIOS MVP
 * Handles mock database operations.
 */

interface Employee {
    id: string;
    name: string;
    department: string;
}

interface Expense {
    id: string;
    employeeId: string;
    amount: number;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
}

class DataService {
    private employees: Employee[] = [
        { id: 'E001', name: 'Alice', department: 'Sales' },
        { id: 'E002', name: 'Bob', department: 'Engineering' }
    ];

    private expenses: Expense[] = [];
    private expenseIdCounter = 1;

    public getEmployee(id: string): Employee | undefined {
        return this.employees.find(e => e.id === id);
    }

    public getEmployeeByName(name: string): Employee | undefined {
        return this.employees.find(e => e.name.toLowerCase() === name.toLowerCase());
    }

    public createExpense(employeeId: string, amount: number, reason: string): Expense {
        const expense: Expense = {
            id: `EXP-${this.expenseIdCounter++}`,
            employeeId,
            amount,
            reason,
            status: 'Pending'
        };
        this.expenses.push(expense);
        return expense;
    }

    public getExpense(id: string): Expense | undefined {
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

    public getAllExpenses(): Expense[] {
        return this.expenses;
    }
}

// Export a singleton instance
export const db = new DataService();
