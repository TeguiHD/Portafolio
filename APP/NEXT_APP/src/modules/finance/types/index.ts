/**
 * Finance Module Types
 * Shared type definitions for the finance module
 */

// Note: Prisma types will be available after running prisma generate
// For now, we define them locally until migration is complete

// ============= Enum Types (matching Prisma schema) =============

export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";
export type AccountType = "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "CASH" | "INVESTMENT" | "LOAN" | "OTHER";
export type BudgetPeriod = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
export type GoalStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

// ============= Dashboard Types =============

export interface DashboardSummary {
    // Balance
    totalBalance: number;
    balanceChange: number; // vs last period
    balanceChangePercent: number;
    
    // Income/Expense
    totalIncome: number;
    totalExpenses: number;
    netFlow: number;
    savingsRate: number;
    
    // Period info
    daysElapsed: number;
    daysRemaining: number;
    
    // Projections
    projectedExpenses: number;
    dailyAverage: number;
    
    // Accounts
    accountCount: number;
}

export interface CategorySummary {
    categoryId: string;
    categoryName: string;
    icon: string | null;
    amount: number;
    percentage: number;
    transactionCount: number;
    trend: number; // vs last period
}

export interface AccountSummary {
    id: string;
    name: string;
    type: AccountType;
    balance: number;
    currency: string;
    color: string | null;
    icon: string | null;
}

export interface BudgetStatus {
    id: string;
    categoryName: string;
    categoryIcon: string | null;
    budgetAmount: number;
    spentAmount: number;
    remainingAmount: number;
    percentage: number;
    status: "ok" | "warning" | "exceeded";
}

export interface RecentTransaction {
    id: string;
    type: TransactionType;
    amount: number;
    description: string;
    categoryName: string | null;
    categoryIcon: string | null;
    accountName: string;
    date: string;
}

export interface GoalProgress {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    targetAmount: number;
    currentAmount: number;
    percentage: number;
    deadline: Date | null;
    daysRemaining: number | null;
    monthlyRequired: number | null;
}

export interface FinanceDashboardData {
    summary: DashboardSummary;
    expensesByCategory: CategorySummary[];
    recentTransactions: RecentTransaction[];
    budgets: BudgetStatus[];
    alerts: FinanceAlert[];
}

// ============= Alert Types =============

export type AlertType = 
    | "budget_warning"
    | "budget_exceeded"
    | "expense_spike"
    | "unusual_expense"
    | "recurring_due"
    | "goal_milestone"
    | "low_balance";

export type AlertPriority = "low" | "medium" | "high";

export interface FinanceAlert {
    id: string;
    type: AlertType;
    priority: AlertPriority;
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}

// ============= Transaction Types =============

export interface TransactionFormData {
    type: TransactionType;
    amount: number;
    description?: string;
    merchant?: string;
    notes?: string;
    categoryId?: string;
    accountId: string;
    toAccountId?: string; // For transfers
    currencyCode: string;
    transactionDate: Date;
}

export interface TransactionFilters {
    type?: TransactionType;
    categoryId?: string;
    accountId?: string;
    startDate?: Date;
    endDate?: Date;
    minAmount?: number;
    maxAmount?: number;
    search?: string;
}

// ============= Chart Types =============

export interface ChartDataPoint {
    label: string;
    value: number;
    color?: string;
}

export interface TimeSeriesDataPoint {
    date: Date;
    income: number;
    expenses: number;
    balance: number;
}

// ============= API Response Types =============

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
