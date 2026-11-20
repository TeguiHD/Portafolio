"use client";

import { useState, useCallback, useEffect, useId } from "react";
import { Building2, ChartPie, Check, CreditCard, PiggyBank, Sparkles, Target, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { BOTON, BOTON_SEC, CAMPO, CIFRA, ERROR, ETIQUETA, FICHA, FOCO, GIRA, LISTA, OPCION, OPCION_NO, OPCION_SI, SUAVE, TARJETA } from "./estilos";

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

const TIPOS_CUENTA = [
    { value: "CHECKING", label: "Cuenta corriente", icon: Building2 },
    { value: "SAVINGS", label: "Ahorro", icon: PiggyBank },
    { value: "CASH", label: "Efectivo", icon: Wallet },
    { value: "CREDIT_CARD", label: "Crédito", icon: CreditCard },
];

/** Ícono de cada paso (decorativo). */
const ICONO_PASO = "size-5 text-[var(--mut)]";

export function FinanceOnboarding({ onComplete, onCreateAccount }: FinanceOnboardingProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [accountData, setAccountData] = useState({
        name: "Cuenta Principal",
        type: "CHECKING",
        balance: 0,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const uid = useId();

    // Check if already onboarded
    useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const res = await fetch("/api/finance/onboarding/status");
                const data = await res.json();
                if (data.completed) {
                    onComplete();
                }
            } catch (err) {
                console.error("Error checking onboarding:", err);
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
        setError(null);
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
        } catch (err) {
            console.error("Error completing onboarding:", err);
            setError(err instanceof Error ? err.message : "No se pudo completar la configuración");
        } finally {
            setLoading(false);
        }
    }, [accountData, onComplete, onCreateAccount]);

    const tipoElegido = TIPOS_CUENTA.find((t) => t.value === accountData.type);

    const steps: OnboardingStep[] = [
        {
            id: 0,
            title: "¡Bienvenido a Finanzas!",
            subtitle: "Tu asistente personal para controlar tus gastos",
            icon: <Wallet aria-hidden="true" className={ICONO_PASO} />,
            content: (
                <div className="space-y-6 text-center">
                    <p className="text-[var(--mut)]">
                        Configura tu cuenta en menos de un minuto y comienza a tomar el control de tu dinero.
                    </p>
                    <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3 sm:gap-4">
                        <Feature icon={<ChartPie aria-hidden="true" className="size-[18px]" />} title="Análisis" description="Visualiza tus gastos" />
                        <Feature icon={<Target aria-hidden="true" className="size-[18px]" />} title="Metas" description="Alcanza objetivos" />
                        <Feature icon={<Sparkles aria-hidden="true" className="size-[18px]" />} title="IA" description="Consejos personalizados" />
                    </ul>
                </div>
            ),
        },
        {
            id: 1,
            title: "Configura tu cuenta",
            subtitle: "Empecemos con tu cuenta principal",
            icon: <CreditCard aria-hidden="true" className={ICONO_PASO} />,
            content: (
                <div className="space-y-5">
                    <div>
                        <label htmlFor={`${uid}-nombre`} className={ETIQUETA}>Nombre de la cuenta</label>
                        <input
                            id={`${uid}-nombre`}
                            type="text"
                            value={accountData.name}
                            onChange={(e) => setAccountData((prev) => ({ ...prev, name: e.target.value }))}
                            className={CAMPO}
                            placeholder="Ej: Mi cuenta corriente"
                        />
                    </div>

                    <fieldset>
                        <legend className={ETIQUETA}>Tipo de cuenta</legend>
                        <div className="grid grid-cols-2 gap-2">
                            {TIPOS_CUENTA.map((type) => {
                                const Icono = type.icon;
                                return (
                                    <button
                                        key={type.value}
                                        type="button"
                                        aria-pressed={accountData.type === type.value}
                                        onClick={() => setAccountData((prev) => ({ ...prev, type: type.value }))}
                                        className={`${OPCION} justify-start ${accountData.type === type.value ? OPCION_SI : OPCION_NO}`}
                                    >
                                        <Icono aria-hidden="true" className="size-[18px] shrink-0" />
                                        <span className="min-w-0 truncate">{type.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>
                </div>
            ),
        },
        {
            id: 2,
            title: "Balance inicial",
            subtitle: "¿Con cuánto empezamos?",
            icon: <PiggyBank aria-hidden="true" className={ICONO_PASO} />,
            content: (
                <div className="space-y-4">
                    <label htmlFor={`${uid}-saldo`} className="block text-center text-[var(--mut)]">
                        Ingresa el saldo actual de tu cuenta para empezar con datos precisos.
                    </label>

                    <div className="relative">
                        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--mut)]">$</span>
                        <input
                            id={`${uid}-saldo`}
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            // Pesos con puntos de miles («250.000»); con type=number el punto se leía como decimal.
                            value={accountData.balance ? accountData.balance.toLocaleString("es-CL") : ""}
                            onChange={(e) =>
                                setAccountData((prev) => ({ ...prev, balance: Number(e.target.value.replace(/\D/g, "").slice(0, 13)) || 0 }))
                            }
                            aria-describedby={`${uid}-saldo-ayuda`}
                            className={`block min-h-14 w-full rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] px-8 py-3 text-center text-2xl text-[var(--txt)] tabular-nums placeholder:text-[var(--mut)] ${FOCO}`}
                            placeholder="0"
                        />
                    </div>

                    <div className="flex flex-wrap justify-center gap-2">
                        {[50000, 100000, 250000, 500000].map((amount) => (
                            <button
                                key={amount}
                                type="button"
                                aria-pressed={accountData.balance === amount}
                                onClick={() => setAccountData((prev) => ({ ...prev, balance: amount }))}
                                className={`${OPCION} ${CIFRA} ${accountData.balance === amount ? OPCION_SI : OPCION_NO}`}
                            >
                                {formatCurrency(amount)}
                            </button>
                        ))}
                    </div>

                    <p id={`${uid}-saldo-ayuda`} className="text-center text-xs text-[var(--mut)]">
                        No te preocupes si no es exacto, podrás ajustarlo después
                    </p>
                </div>
            ),
        },
        {
            id: 3,
            title: "¡Todo listo!",
            subtitle: "Estás a punto de comenzar",
            icon: <Check aria-hidden="true" className={ICONO_PASO} />,
            content: (
                <div className="space-y-6">
                    <div>
                        <h2 className="mb-2 text-sm font-medium text-[var(--mut)]">Tu configuración</h2>
                        <dl className={`${LISTA} m-0`}>
                            <div className="flex justify-between gap-4 border-b border-[var(--linea)] px-1 py-2.5">
                                <dt className="text-[var(--mut)]">Cuenta</dt>
                                <dd className="m-0 min-w-0 truncate text-right text-[var(--txt)]">{accountData.name}</dd>
                            </div>
                            <div className="flex justify-between gap-4 border-b border-[var(--linea)] px-1 py-2.5">
                                <dt className="text-[var(--mut)]">Tipo</dt>
                                <dd className="m-0 text-right text-[var(--txt)]">{tipoElegido?.label ?? accountData.type}</dd>
                            </div>
                            <div className="flex justify-between gap-4 border-b border-[var(--linea)] px-1 py-2.5">
                                <dt className="text-[var(--mut)]">Balance</dt>
                                <dd className={`m-0 text-right font-semibold text-[var(--txt)] ${CIFRA}`}>{formatCurrency(accountData.balance)}</dd>
                            </div>
                        </dl>
                    </div>

                    <div className={`${SUAVE} text-center`}>
                        <p>Próximos pasos sugeridos:</p>
                        <ul className="m-0 mt-2 list-none space-y-1 p-0">
                            <li>Registra tu primera transacción</li>
                            <li>Personaliza tus categorías</li>
                            <li>Define una meta de ahorro</li>
                        </ul>
                    </div>
                </div>
            ),
        },
    ];

    const currentStepData = steps[currentStep];

    return (
        <div className={`${TARJETA} flex w-full flex-col sm:min-h-[600px]`}>
            {/* Progreso */}
            <div className="flex items-center gap-3 p-4">
                <div aria-hidden="true" className="flex flex-1 gap-2">
                    {steps.map((step, index) => (
                        <div
                            key={step.id}
                            className={`h-1 flex-1 rounded-full transition-colors duration-200 motion-reduce:transition-none ${
                                index <= currentStep ? "bg-[var(--acento)]" : "bg-[var(--linea-2)]"
                            }`}
                        />
                    ))}
                </div>
                <p aria-live="polite" className={`shrink-0 font-mono text-xs text-[var(--mut)] ${CIFRA}`}>
                    Paso {currentStep + 1} de {steps.length}
                </p>
            </div>

            {/* Contenido */}
            <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8 sm:px-6">
                <div className="w-full max-w-md space-y-6 text-center">
                    <span className={`${FICHA} mx-auto`}>{currentStepData.icon}</span>

                    <div>
                        <h1 className="text-2xl font-bold tracking-[-0.03em] text-[var(--txt)]">{currentStepData.title}</h1>
                        <p className="mt-1 text-[var(--mut)]">{currentStepData.subtitle}</p>
                    </div>

                    <div className="text-left">{currentStepData.content}</div>
                </div>
            </div>

            {/* Navegación */}
            <div className="border-t border-[var(--linea)] p-4 sm:p-6">
                <div className="mx-auto max-w-md space-y-3">
                    {error && (
                        <p role="alert" className={ERROR}>
                            {error}
                        </p>
                    )}
                    <div className="flex gap-3">
                        {currentStep > 0 && (
                            <button type="button" onClick={handleBack} className={`${BOTON_SEC} flex-1`}>
                                Atrás
                            </button>
                        )}

                        {currentStep < 3 ? (
                            <button type="button" onClick={handleNext} className={`${BOTON} flex-1`}>
                                Siguiente
                            </button>
                        ) : (
                            <button type="button" onClick={handleFinish} disabled={loading} className={`${BOTON} flex-1`}>
                                {loading ? (
                                    <>
                                        <span aria-hidden="true" className={GIRA} />
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
        </div>
    );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <li className="flex items-center gap-3 text-left sm:flex-col sm:gap-1 sm:text-center">
            <span className="shrink-0 text-[var(--mut)]">{icon}</span>
            <span className="min-w-0">
                <span className="block text-sm font-medium text-[var(--txt)]">{title}</span>
                <span className="block text-xs text-[var(--mut)]">{description}</span>
            </span>
        </li>
    );
}
