"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Product {
    id: string;
    name: string;
    category: string | null;
    lastPrice: number | null;
    avgPrice: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    purchaseCount: number;
    lastPurchased: string | null;
    commonMerchants: string[];
    items: Array<{
        transaction: {
            id: string;
            merchant: string | null;
            transactionDate: string;
        };
    }>;
}

interface ProductsData {
    data: Product[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    categories: Array<{ category: string; count: number }>;
    stats: {
        totalProducts: number;
        avgPrice: number | null;
    };
}

export function ProductCatalog() {
    const [data, setData] = useState<ProductsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [sortBy, setSortBy] = useState<"purchaseCount" | "lastPurchased" | "avgPrice" | "name">("purchaseCount");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [page, setPage] = useState(1);

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "30",
                sortBy,
                sortOrder: "desc",
            });
            if (search) params.set("search", search);
            if (selectedCategory) params.set("category", selectedCategory);

            const res = await fetch(`/api/finance/products?${params}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    }, [page, search, selectedCategory, sortBy]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const formatPrice = (price: number | null) => {
        if (price === null) return "-";
        return `$${price.toLocaleString("es-CL")}`;
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString("es-CL");
    };

    if (loading && !data) {
        return (
            <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-neutral-800 p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-neutral-800 rounded w-1/3" />
                    <div className="h-10 bg-neutral-800 rounded" />
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-neutral-800 rounded" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!data || data.data.length === 0) {
        return (
            <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-neutral-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl">📦</span>
                    Catálogo de Productos
                </h3>
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <p className="text-neutral-400">No hay productos registrados aún</p>
                    <p className="text-neutral-500 text-sm mt-1">
                        Escanea boletas con productos para comenzar a rastrearlos
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl border border-neutral-800 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-neutral-800">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="text-2xl">📦</span>
                        Catálogo de Productos
                        <span className="text-sm font-normal text-neutral-400">
                            ({data.stats.totalProducts} productos)
                        </span>
                    </h3>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar producto..."
                            className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-accent-1"
                        />
                    </div>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white focus:outline-none"
                    >
                        <option value="">Todas las categorías</option>
                        {data.categories.map((cat) => (
                            <option key={cat.category} value={cat.category}>
                                {cat.category} ({cat.count})
                            </option>
                        ))}
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        className="px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white focus:outline-none"
                    >
                        <option value="purchaseCount">Más comprados</option>
                        <option value="lastPurchased">Recientes</option>
                        <option value="avgPrice">Precio promedio</option>
                        <option value="name">Nombre</option>
                    </select>
                </div>
            </div>

            {/* Products Grid */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                {data.data.map((product) => (
                    <motion.button
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        className="text-left p-4 bg-neutral-800/30 hover:bg-neutral-800/50 rounded-xl border border-neutral-700/50 hover:border-neutral-600 transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <h4 className="text-white font-medium truncate flex-1 pr-2">
                                {product.name}
                            </h4>
                            <span className="text-xs bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded-full shrink-0">
                                x{product.purchaseCount}
                            </span>
                        </div>
                        
                        <div className="text-sm text-neutral-400 space-y-1">
                            <div className="flex justify-between">
                                <span>Precio promedio:</span>
                                <span className="text-white">{formatPrice(product.avgPrice)}</span>
                            </div>
                            {product.minPrice !== product.maxPrice && (
                                <div className="flex justify-between text-xs">
                                    <span>Rango:</span>
                                    <span className="text-neutral-300">
                                        {formatPrice(product.minPrice)} - {formatPrice(product.maxPrice)}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between text-xs">
                                <span>Última compra:</span>
                                <span className="text-neutral-300">{formatDate(product.lastPurchased)}</span>
                            </div>
                        </div>

                        {product.commonMerchants.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {product.commonMerchants.slice(0, 2).map((m, i) => (
                                    <span
                                        key={i}
                                        className="text-xs bg-neutral-700/50 text-neutral-400 px-2 py-0.5 rounded truncate max-w-[100px]"
                                    >
                                        {m}
                                    </span>
                                ))}
                                {product.commonMerchants.length > 2 && (
                                    <span className="text-xs text-neutral-500">
                                        +{product.commonMerchants.length - 2}
                                    </span>
                                )}
                            </div>
                        )}
                    </motion.button>
                ))}
            </div>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
                <div className="p-4 border-t border-neutral-800 flex items-center justify-between">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-neutral-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors"
                    >
                        Anterior
                    </button>
                    <span className="text-neutral-400 text-sm">
                        Página {page} de {data.pagination.totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                        disabled={page >= data.pagination.totalPages}
                        className="px-4 py-2 bg-neutral-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors"
                    >
                        Siguiente
                    </button>
                </div>
            )}

            {/* Product Detail Modal */}
            <AnimatePresence>
                {selectedProduct && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                        onClick={() => setSelectedProduct(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-neutral-900 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">{selectedProduct.name}</h3>
                                <button
                                    onClick={() => setSelectedProduct(null)}
                                    className="p-2 text-neutral-400 hover:text-white transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
                                {/* Price Stats */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-neutral-800/50 rounded-xl p-3">
                                        <p className="text-neutral-400 text-xs">Precio Promedio</p>
                                        <p className="text-xl font-bold text-white">{formatPrice(selectedProduct.avgPrice)}</p>
                                    </div>
                                    <div className="bg-neutral-800/50 rounded-xl p-3">
                                        <p className="text-neutral-400 text-xs">Compras</p>
                                        <p className="text-xl font-bold text-white">{selectedProduct.purchaseCount}</p>
                                    </div>
                                    <div className="bg-neutral-800/50 rounded-xl p-3">
                                        <p className="text-neutral-400 text-xs">Precio Mínimo</p>
                                        <p className="text-lg font-semibold text-emerald-400">{formatPrice(selectedProduct.minPrice)}</p>
                                    </div>
                                    <div className="bg-neutral-800/50 rounded-xl p-3">
                                        <p className="text-neutral-400 text-xs">Precio Máximo</p>
                                        <p className="text-lg font-semibold text-red-400">{formatPrice(selectedProduct.maxPrice)}</p>
                                    </div>
                                </div>

                                {/* Common Merchants */}
                                {selectedProduct.commonMerchants.length > 0 && (
                                    <div>
                                        <p className="text-neutral-400 text-sm mb-2">Comercios donde lo compras:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedProduct.commonMerchants.map((merchant, i) => (
                                                <span
                                                    key={i}
                                                    className="px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full text-sm"
                                                >
                                                    {merchant}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Recent Purchases */}
                                {selectedProduct.items.length > 0 && (
                                    <div>
                                        <p className="text-neutral-400 text-sm mb-2">Compras recientes:</p>
                                        <div className="space-y-2">
                                            {selectedProduct.items.map((item, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center justify-between p-2 bg-neutral-800/30 rounded-lg text-sm"
                                                >
                                                    <span className="text-neutral-300">
                                                        {item.transaction.merchant || "Sin comercio"}
                                                    </span>
                                                    <span className="text-neutral-500">
                                                        {formatDate(item.transaction.transactionDate)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
