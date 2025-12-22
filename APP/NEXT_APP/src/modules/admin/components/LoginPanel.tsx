"use client";

import { Button } from "@/components/ui/Button";

interface LoginPanelProps {
  onSuccess: () => void;
}

export function LoginPanel({ onSuccess }: LoginPanelProps) {
  return (
    <div className="glass-panel mx-auto max-w-md space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
      <h2 className="text-xl font-semibold text-white">Acceso admin</h2>
      <p className="text-sm text-neutral-300">
        Este acceso se gestiona con NextAuth. Continúa al login seguro.
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          className="w-full"
          onClick={() => {
            onSuccess();
            window.location.href = "/login";
          }}
        >
          Ir a /login
        </Button>
      </div>
    </div>
  );
}



