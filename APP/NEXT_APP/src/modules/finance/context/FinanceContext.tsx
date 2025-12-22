"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { SupportedCurrency } from "@/lib/currency";

interface FinanceContextType {
    // User preferences
    baseCurrency: SupportedCurrency;
    setBaseCurrency: (currency: SupportedCurrency) => void;
    
    // Date range for dashboard
    dateRange: {
        start: Date;
        end: Date;
    };
    setDateRange: (start: Date, end: Date) => void;
    
    // Selected account filter
    selectedAccountId: string | null;
    setSelectedAccountId: (id: string | null) => void;
    
    // Refresh triggers
    refreshKey: number;
    triggerRefresh: () => void;
    
    // Loading states
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export function useFinance() {
    const context = useContext(FinanceContext);
    if (!context) {
        throw new Error("useFinance must be used within a FinanceProvider");
    }
    return context;
}

interface FinanceProviderProps {
    children: ReactNode;
    defaultCurrency?: SupportedCurrency;
}

export function FinanceProvider({ 
    children, 
    defaultCurrency = "CLP" 
}: FinanceProviderProps) {
    const [baseCurrency, setBaseCurrency] = useState<SupportedCurrency>(defaultCurrency);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    
    // Default to current month
    const now = new Date();
    const [dateRange, setDateRangeState] = useState({
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    });

    const setDateRange = useCallback((start: Date, end: Date) => {
        setDateRangeState({ start, end });
    }, []);

    const triggerRefresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    return (
        <FinanceContext.Provider
            value={{
                baseCurrency,
                setBaseCurrency,
                dateRange,
                setDateRange,
                selectedAccountId,
                setSelectedAccountId,
                refreshKey,
                triggerRefresh,
                isLoading,
                setIsLoading,
            }}
        >
            {children}
        </FinanceContext.Provider>
    );
}
