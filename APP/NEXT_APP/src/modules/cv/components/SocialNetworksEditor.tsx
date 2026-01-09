/**
 * SocialNetworksEditor Component
 * Dynamic editor for social networks with RenderCV-style support
 */
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SocialNetwork } from "../utils/latex-templates-enhanced";

// Available social networks with their icons and placeholders
export const AVAILABLE_NETWORKS = {
    LinkedIn: {
        icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
        ),
        placeholder: "linkedin.com/in/username",
        urlPrefix: "https://linkedin.com/in/",
    },
    GitHub: {
        icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
        ),
        placeholder: "github.com/username",
        urlPrefix: "https://github.com/",
    },
    GitLab: {
        icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.423-.73-.423-.867 0L16.418 9.45H7.582L4.919 1.263C4.783.84 4.185.84 4.05 1.263L1.386 9.45.044 13.587a.924.924 0 00.335 1.035L12 23.054l11.621-8.432a.92.92 0 00.334-1.035" />
            </svg>
        ),
        placeholder: "gitlab.com/username",
        urlPrefix: "https://gitlab.com/",
    },
    Twitter: {
        icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
        ),
        placeholder: "@username",
        urlPrefix: "https://x.com/",
    },
    Website: {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
        ),
        placeholder: "www.mywebsite.com",
        urlPrefix: "https://",
    },
    ORCID: {
        icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378c.525 0 .947.431.947.947s-.422.947-.947.947a.95.95 0 01-.947-.947c0-.525.422-.947.947-.947zm-.684 3.655h1.369v9.289H6.685V8.033zm2.783 0h3.717c3.249 0 5.199 2.161 5.199 4.649 0 2.481-1.956 4.64-5.199 4.64h-3.717V8.033zm1.369 1.25v6.789h2.272c2.373 0 3.899-1.519 3.899-3.399 0-1.87-1.519-3.39-3.899-3.39h-2.272z" />
            </svg>
        ),
        placeholder: "0000-0000-0000-0000",
        urlPrefix: "https://orcid.org/",
    },
    ResearchGate: {
        icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.586 0c-1.75.002-3.165 1.418-3.165 3.168 0 1.752 1.416 3.168 3.165 3.168 1.752 0 3.168-1.416 3.168-3.168C22.754 1.418 21.338.002 19.586 0zM.078 5.076v13.848h5.898V5.076H.078zm8.424 0v13.848h5.898V12.5c0-1.17.956-2.125 2.125-2.125s2.125.955 2.125 2.125v6.424h5.898V11.25c0-3.422-2.773-6.174-6.195-6.174-1.75 0-3.334.723-4.465 1.885V5.076H8.502z" />
            </svg>
        ),
        placeholder: "profile/Username",
        urlPrefix: "https://researchgate.net/",
    },
    StackOverflow: {
        icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.725 0l-1.72 1.277 6.39 8.588 1.716-1.277L15.725 0zm-3.94 3.418l-1.369 1.644 8.225 6.85 1.369-1.644-8.225-6.85zm-3.15 4.465l-.905 1.94 9.702 4.517.904-1.94-9.701-4.517zm-1.85 4.86l-.44 2.093 10.473 2.201.44-2.092-10.473-2.203zM1.89 15.47V24h19.19v-8.53h-2.133v6.397H4.021v-6.396H1.89zm4.265 2.133v2.13h10.66v-2.13H6.154z" />
            </svg>
        ),
        placeholder: "users/12345/username",
        urlPrefix: "https://stackoverflow.com/",
    },
} as const;

export type NetworkType = keyof typeof AVAILABLE_NETWORKS;

interface SocialNetworksEditorProps {
    networks: SocialNetwork[];
    onChange: (networks: SocialNetwork[]) => void;
}

export function SocialNetworksEditor({ networks, onChange }: SocialNetworksEditorProps) {
    const [isAdding, setIsAdding] = useState(false);

    const addNetwork = (networkType: NetworkType) => {
        const newNetwork: SocialNetwork = {
            network: networkType,
            username: "",
        };
        onChange([...networks, newNetwork]);
        setIsAdding(false);
    };

    const updateNetwork = (index: number, username: string) => {
        const updated = [...networks];
        updated[index] = { ...updated[index], username };
        onChange(updated);
    };

    const removeNetwork = (index: number) => {
        onChange(networks.filter((_, i) => i !== index));
    };

    // Get networks not yet added
    const availableToAdd = Object.keys(AVAILABLE_NETWORKS).filter(
        (key) => !networks.some((n) => n.network === key)
    ) as NetworkType[];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="block text-sm text-neutral-400">Redes Sociales</label>
                {availableToAdd.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setIsAdding(!isAdding)}
                        className="text-sm text-accent-1 hover:text-accent-1/80 flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Agregar red
                    </button>
                )}
            </div>

            {/* Add network selector */}
            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-2 p-3 rounded-xl bg-white/5 border border-accent-1/10"
                    >
                        {availableToAdd.map((networkType) => {
                            const network = AVAILABLE_NETWORKS[networkType];
                            return (
                                <button
                                    key={networkType}
                                    type="button"
                                    onClick={() => addNetwork(networkType)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-accent-1/20 text-neutral-300 hover:text-accent-1 transition-colors text-sm"
                                >
                                    {network.icon}
                                    {networkType}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Current networks */}
            <div className="space-y-3">
                <AnimatePresence>
                    {networks.map((network, index) => {
                        const config = AVAILABLE_NETWORKS[network.network];
                        return (
                            <motion.div
                                key={`${network.network}-${index}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex items-center gap-3"
                            >
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 text-neutral-400">
                                    {config.icon}
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-neutral-500 mb-1">{network.network}</div>
                                    <input
                                        type="text"
                                        value={network.username || ""}
                                        onChange={(e) => updateNetwork(index, e.target.value)}
                                        placeholder={config.placeholder}
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-accent-1/20 text-white text-sm focus:outline-none focus:border-accent-1/50"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeNetwork(index)}
                                    className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {networks.length === 0 && !isAdding && (
                    <div className="text-center py-6 text-neutral-500 text-sm">
                        No hay redes sociales configuradas.
                        <button
                            type="button"
                            onClick={() => setIsAdding(true)}
                            className="text-accent-1 hover:underline ml-1"
                        >
                            Agregar una
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
