"use client";

import { CampoNumero } from "@/components/ui/CampoNumero";
import { useState, useEffect, useCallback, useId } from "react";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { CAMPO, CIFRA, ERROR, ETIQUETA, FOCO, GIRA, ICONO, OPCION, OPCION_NO, OPCION_SI, SECCION, BLOQUE } from "./estilos";

interface Currency {
    id: string;
    code: string;
    name: string;
    symbol: string;
    decimals: number;
}

interface ConversionResult {
    amount: number;
    from: string;
    to: string;
    rate: number;
    converted: number;
    formattedRate: string;
    /** «Tasa del 20-11-2026» cuando el dólar es un respaldo de otro día. */
    nota?: string;
}

export function CurrencyConverter() {
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);
    const [converting, setConverting] = useState(false);
    const [amount, setAmount] = useState<number | null>(1000);
    const [fromCurrency, setFromCurrency] = useState<string>("CLP");
    const [toCurrency, setToCurrency] = useState<string>("USD");
    const [result, setResult] = useState<ConversionResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const uid = useId();

    useEffect(() => {
        async function fetchCurrencies() {
            try {
                const res = await fetch("/api/finance/currencies?active=true");
                const data = await res.json();
                setCurrencies(data.data || []);
            } catch (err) {
                console.error("Error fetching currencies:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchCurrencies();
    }, []);

    const convert = useCallback(async () => {
        if (!amount || !fromCurrency || !toCurrency) return;

        setConverting(true);
        setError(null);

        try {
            const res = await fetch("/api/finance/exchange-rates/convert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount,
                    from: fromCurrency,
                    to: toCurrency,
                }),
            });

            if (!res.ok) {
                const datos = await res.json().catch(() => null) as { error?: string } | null;
                throw new Error(datos?.error || "No se pudo convertir: intenta de nuevo en un momento");
            }

            const data = await res.json();
            setResult(data);
        } catch (err) {
            setError((err as Error).message);
            setResult(null);
        } finally {
            setConverting(false);
        }
    }, [amount, fromCurrency, toCurrency]);

    // Auto-convert when values change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (amount && fromCurrency && toCurrency) {
                convert();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [amount, fromCurrency, toCurrency, convert]);

    const swapCurrencies = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
    };

    const fromCurrencyObj = currencies.find((c) => c.code === fromCurrency);
    const toCurrencyObj = currencies.find((c) => c.code === toCurrency);

    if (loading) {
        return (
            <div role="status" className={BLOQUE}>
                <span className="sr-only">Cargando monedas…</span>
                <div aria-hidden="true" className="animate-pulse space-y-4 motion-reduce:animate-none">
                    <div className="h-6 w-1/3 rounded bg-[var(--fondo-2)]" />
                    <div className="h-14 rounded bg-[var(--fondo-2)]" />
                    <div className="h-14 rounded bg-[var(--fondo-2)]" />
                </div>
            </div>
        );
    }

    return (
        <section aria-labelledby={`${uid}-titulo`} className={`${BLOQUE} space-y-6`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id={`${uid}-titulo`} className="text-lg font-semibold text-[var(--txt)]">Convertidor de moneda</h2>
                <p className="text-sm text-[var(--mut)]">{result?.nota ?? "Tasas del día"}</p>
            </div>

            <div>
                <label htmlFor={`${uid}-cantidad`} className={ETIQUETA}>Cantidad</label>
                <div className="relative">
                    <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg text-[var(--mut)]">
                        {fromCurrencyObj?.symbol || "$"}
                    </span>
                    <CampoNumero
                        id={`${uid}-cantidad`}
                        decimales={2}
                        valor={amount}
                        alCambiar={setAmount}
                        className={`block min-h-14 w-full rounded-lg border border-[var(--linea-2)] bg-[var(--fondo-2)] py-3 pr-4 pl-12 text-xl font-semibold text-[var(--txt)] tabular-nums placeholder:text-[var(--mut)] ${FOCO}`}
                    />
                </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 sm:gap-3">
                <div>
                    <label htmlFor={`${uid}-de`} className={ETIQUETA}>De</label>
                    <select
                        id={`${uid}-de`}
                        value={fromCurrency}
                        onChange={(e) => setFromCurrency(e.target.value)}
                        className={CAMPO}
                    >
                        {currencies.map((c) => (
                            <option key={c.code} value={c.code}>
                                {c.code} - {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="button"
                    onClick={swapCurrencies}
                    aria-label="Intercambiar monedas"
                    title="Intercambiar monedas"
                    className={ICONO}
                >
                    <ArrowLeftRight aria-hidden="true" className="size-[18px]" />
                </button>

                <div>
                    <label htmlFor={`${uid}-a`} className={ETIQUETA}>A</label>
                    <select
                        id={`${uid}-a`}
                        value={toCurrency}
                        onChange={(e) => setToCurrency(e.target.value)}
                        className={CAMPO}
                    >
                        {currencies.map((c) => (
                            <option key={c.code} value={c.code}>
                                {c.code} - {c.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div aria-live="polite">
                {converting ? (
                    <p className="flex items-center justify-center gap-2 py-6 text-sm text-[var(--mut)]">
                        <span aria-hidden="true" className={GIRA} />
                        Convirtiendo…
                    </p>
                ) : result ? (
                    <div className="space-y-2 rounded-lg bg-[var(--fondo-2)] p-5">
                        <p className={`flex items-center gap-2 text-[var(--mut)] ${CIFRA}`}>
                            <span>
                                {fromCurrencyObj?.symbol}
                                {formatCurrency(result.amount).replace("$", "")} {result.from}
                            </span>
                            <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                        </p>
                        <p className={`text-3xl font-bold tracking-[-0.03em] break-words text-[var(--txt)] ${CIFRA}`}>
                            {toCurrencyObj?.symbol}
                            {result.converted.toLocaleString("es-CL", {
                                minimumFractionDigits: toCurrencyObj?.decimals || 2,
                                maximumFractionDigits: toCurrencyObj?.decimals || 2,
                            })}{" "}
                            <span className="text-xl font-semibold text-[var(--mut)]">{result.to}</span>
                        </p>
                        {result.formattedRate && (
                            <p className="text-sm text-[var(--mut)]">Tasa: {result.formattedRate}</p>
                        )}
                    </div>
                ) : null}
            </div>
            {!converting && !result && error ? (
                <p role="alert" className={ERROR}>
                    {error}
                </p>
            ) : null}

            <div className="border-t border-[var(--linea)] pt-5">
                <h3 id={`${uid}-populares`} className={`${SECCION} mb-3`}>Conversiones populares</h3>
                <div role="group" aria-labelledby={`${uid}-populares`} className="flex flex-wrap gap-2">
                    {[
                        { from: "CLP", to: "USD" },
                        { from: "CLP", to: "EUR" },
                        { from: "USD", to: "CLP" },
                        { from: "EUR", to: "CLP" },
                        { from: "USD", to: "EUR" },
                    ].map(({ from, to }) => (
                        <button
                            key={`${from}-${to}`}
                            type="button"
                            aria-pressed={fromCurrency === from && toCurrency === to}
                            aria-label={`${from} a ${to}`}
                            onClick={() => {
                                setFromCurrency(from);
                                setToCurrency(to);
                            }}
                            className={`${OPCION} ${fromCurrency === from && toCurrency === to ? OPCION_SI : OPCION_NO}`}
                        >
                            {from} → {to}
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
