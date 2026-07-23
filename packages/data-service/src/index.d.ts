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
declare class DataService {
    private employees;
    private expenses;
    private expenseIdCounter;
    getEmployee(id: string): Employee | undefined;
    getEmployeeByName(name: string): Employee | undefined;
    createExpense(employeeId: string, amount: number, reason: string): Expense;
    getExpense(id: string): Expense | undefined;
    updateExpenseStatus(id: string, status: 'Pending' | 'Approved' | 'Rejected'): boolean;
    getAllExpenses(): Expense[];
}
export declare const db: DataService;
export {};
