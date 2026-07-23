"use strict";
/**
 * Mock Data Service for AIOS MVP
 * Handles mock database operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
class DataService {
    employees = [
        { id: 'E001', name: 'Alice', department: 'Sales' },
        { id: 'E002', name: 'Bob', department: 'Engineering' }
    ];
    expenses = [];
    expenseIdCounter = 1;
    getEmployee(id) {
        return this.employees.find(e => e.id === id);
    }
    getEmployeeByName(name) {
        return this.employees.find(e => e.name.toLowerCase() === name.toLowerCase());
    }
    createExpense(employeeId, amount, reason) {
        const expense = {
            id: `EXP-${this.expenseIdCounter++}`,
            employeeId,
            amount,
            reason,
            status: 'Pending'
        };
        this.expenses.push(expense);
        return expense;
    }
    getExpense(id) {
        return this.expenses.find(e => e.id === id);
    }
    updateExpenseStatus(id, status) {
        const expense = this.getExpense(id);
        if (expense) {
            expense.status = status;
            return true;
        }
        return false;
    }
    getAllExpenses() {
        return this.expenses;
    }
}
// Export a singleton instance
exports.db = new DataService();
//# sourceMappingURL=index.js.map