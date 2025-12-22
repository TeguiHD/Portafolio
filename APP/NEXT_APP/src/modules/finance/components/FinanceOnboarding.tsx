"use client";

import { useState, useCallback, useEffect } from "react";
import { formatCurrency } from "@/lib/currency";

interface OnboardingStep {
    id: number;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    content: React.ReactNode;
}

interface FinanceOnboardingProps {
    onComplete: () => void;
    onCreateAccount?: (data: { name: string; type: string; balance: number }) => Promise<void>;
}

export function FinanceOnboarding({ onComplete, onCreateAccount }: FinanceOnboardingProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [accountData, setAccountData] = useState({
        name: "Cuenta Principal",
        type: "CHECKING",
        balance: 0,
    });
    const [loading, setLoading] = useState(false);

    // Check if already onboarded
    useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const res = await fetch("/api/finance/onboarding/status");
                const data = await res.json();
                if (data.completed) {
                    onComplete();
                }
            } catch (error) {
                console.error("Error checking onboarding:", error);
            }
        };
        checkOnboarding();
    }, [onComplete]);

    const handleNext = useCallback(() => {
        if (currentStep < 3) {
            setCurrentStep((prev) => prev + 1);
        }
    }, [currentStep]);

    const handleBack = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
        }
    }, [currentStep]);

    const handleFinish = useCallback(async () => {
        setLoading(true);
        try {
            // Create account if callback provided
            if (onCreateAccount) {
                await onCreateAccount(accountData);
            } else {
                // Direct API call
                const response = await fetch("/api/finance/accounts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: accountData.name,
                        type: accountData.type,
                        initialBalance: accountData.balance,
                        currency: "CLP",
                        isDefault: true,
                    }),
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Error creating account:", errorData);
                    throw new Error(errorData.error || "Error al crear cuenta");
                }
            }

            // Mark onboarding as complete
            await fetch("/api/finance/onboarding/complete", { method: "POST" });

            onComplete();
        } catch (error) {
            console.error("Error completing onboarding:", error);
        } finally {
            setLoading(false);
        }
    }, [accountData, onComplete, onCreateAccount]);

    const steps: OnboardingStep[] = [
        {
            id: 0,
            title: "¡Bienvenido a Finanzas!",
            subtitle: "Tu asistente personal para controlar tus gastos",
            icon: (
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            ),
            content: (
                <div className="text-center space-y-4">
                    <p className="text-gray-400">
                        Configura tu cuenta en menos de un minuto y comienza a tomar el control de tu dinero.
                    </p>
                    <div className="grid grid-cols-3 gap-4 mt-6">
                        <Feature icon="📊" title="Análisis" description="Visualiza tus gastos" />
                        <Feature icon="🎯" title="Metas" description="Alcanza objetivos" />
                        <Feature icon="🤖" title="IA" description="Consejos personalizados" />
                    </div>
                </div>
            ),
        },
        {
            id: 1,
            title: "Configura tu cuenta",
            subtitle: "Empecemos con tu cuenta principal",
            icon: (
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                </div>
            ),
            content: (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Nombre de la cuenta</label>
                        <input
                            type="text"
                            value={accountData.name}
                            onChange={(e) => setAccountData((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white
                                     focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="Ej: Mi cuenta corriente"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Tipo de cuenta</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { value: "CHECKING", label: "Cuenta Corriente", icon: "🏦" },
                                { value: "SAVINGS", label: "Ahorro", icon: "💰" },
                                { value: "CASH", label: "Efectivo", icon: "💵" },
                                { value: "CREDIT_CARD", label: "Crédito", icon: "💳" },
                            ].map((type) => (
                                <button
                                    key={type.value}
                                    onClick={() => setAccountData((prev) => ({ ...prev, type: type.value }))}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        accountData.type === type.value
                                            ? "bg-blue-500/20 border-blue-500"
                                            : "bg-gray-800 border-gray-700 hover:border-gray-600"
                                    }`}
                                >
                                    <span className="text-xl">{type.icon}</span>
                                    <p className="text-sm text-white mt-1">{type.label}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: 2,
            title: "Balance inicial",
            subtitle: "¿Con cuánto empezamos?",
            icon: (
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
            ),
            content: (
                <div className="space-y-4">
                    <p className="text-gray-400 text-center">
                        Ingresa el saldo actual de tu cuenta para empezar con datos precisos.
                    </p>

                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                            type="number"
                            value={accountData.balance || ""}
                            onChange={(e) =>
                                setAccountData((prev) => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))
                            }
                            className="w-full px-4 py-4 pl-8 bg-gray-800 border border-gray-700 rounded-xl text-white text-2xl text-center
                                     focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="0"
                        />
                    </div>

                    <div className="flex gap-2 justify-center">
                        {[50000, 100000, 250000, 500000].map((amount) => (
                            <button
                                key={amount}
                                onClick={() => setAccountData((prev) => ({ ...prev, balance: amount }))}
                                className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-400
                                         hover:bg-gray-700 hover:text-white transition-colors"
                            >
                                {formatCurrency(amount)}
                            </button>
                        ))}
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                        💡 No te preocupes si no es exacto, podrás ajustarlo después
                    </p>
                </div>
            ),
        },
        {
            id: 3,
            title: "¡Todo listo!",
            subtitle: "Estás a punto de comenzar",
            icon: (
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            ),
            content: (
                <div className="space-y-6">
                    <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
                        <h4 className="text-sm font-medium text-gray-400">Tu configuración:</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Cuenta:</span>
                                <span className="text-white">{accountData.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Tipo:</span>
                                <span className="text-white capitalize">{accountData.type}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Balance:</span>
                                <span className="text-green-400">{formatCurrency(accountData.balance)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-center text-gray-400 text-sm">
                        <p>Próximos pasos sugeridos:</p>
                        <ul className="mt-2 space-y-1">
                            <li>✨ Registra tu primera transacción</li>
                            <li>📂 Personaliza tus categorías</li>
                            <li>🎯 Define una meta de ahorro</li>
                        </ul>
                    </div>
                </div>
            ),
        },
    ];

    const currentStepData = steps[currentStep];

    return (
        <div className="w-full bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-2xl border border-gray-700/50 flex flex-col min-h-[600px]">
            {/* Progress bar */}
            <div className="p-4">
                <div className="flex gap-2">
                    {steps.map((step, index) => (
                        <div
                            key={step.id}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                                index <= currentStep ? "bg-blue-500" : "bg-gray-700"
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
                <div className="max-w-md w-full text-center space-y-6">
                    {/* Icon */}
                    <div className="flex justify-center">{currentStepData.icon}</div>

                    {/* Title */}
                    <div>
                        <h2 className="text-2xl font-bold text-white">{currentStepData.title}</h2>
                        <p className="text-gray-400 mt-1">{currentStepData.subtitle}</p>
                    </div>

                    {/* Step content */}
                    <div className="text-left">{currentStepData.content}</div>
                </div>
            </div>

            {/* Navigation */}
            <div className="p-6 bg-gray-900/50 backdrop-blur-sm rounded-b-2xl">
                <div className="max-w-md mx-auto flex gap-3">
                    {currentStep > 0 && (
                        <button
                            onClick={handleBack}
                            className="flex-1 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors"
                        >
                            Atrás
                        </button>
                    )}

                    {currentStep < 3 ? (
                        <button
                            onClick={handleNext}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors"
                        >
                            Siguiente
                        </button>
                    ) : (
                        <button
                            onClick={handleFinish}
                            disabled={loading}
                            className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-500 transition-colors
                                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Configurando...
                                </>
                            ) : (
                                "¡Comenzar!"
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Feature({ icon, title, description }: { icon: string; title: string; description: string }) {
    return (
        <div className="text-center">
            <span className="text-2xl">{icon}</span>
            <p className="text-white text-sm font-medium mt-1">{title}</p>
            <p className="text-gray-500 text-xs">{description}</p>
        </div>
    );
}
