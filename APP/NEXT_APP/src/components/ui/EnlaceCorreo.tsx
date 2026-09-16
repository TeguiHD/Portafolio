"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Enlace a un correo que no viaja escrito en el HTML.
 *
 * Cloudflare hacía esto mismo con un script suyo, pero nuestra CSP usa
 * `strict-dynamic` y lo bloqueaba: salía un error en consola en todas las páginas y
 * el correo tampoco funcionaba. Ahora la dirección se arma aquí, al montar, así que
 * un rastreador que solo lea el HTML no encuentra una dirección que copiar.
 *
 * Sin JavaScript queda el texto visible y una pista legible para una persona.
 */
export function EnlaceCorreo({
  usuario,
  dominio,
  className,
  children,
  asunto,
}: {
  usuario: string;
  dominio: string;
  className?: string;
  children?: ReactNode;
  asunto?: string;
}) {
  const [destino, setDestino] = useState<string | null>(null);

  useEffect(() => {
    const cola = asunto ? `?subject=${encodeURIComponent(asunto)}` : "";
    setDestino(`mailto:${usuario}@${dominio}${cola}`);
  }, [usuario, dominio, asunto]);

  // Antes de hidratar (y sin JavaScript) la dirección sale enmascarada: si se escribiera
  // entera, un rastreador la copiaría del HTML y Cloudflare volvería a ofuscarla con su
  // script, que es justo lo que nuestra CSP bloquea.
  if (!destino) {
    return <span className={className}>{children ?? `${usuario} [arroba] ${dominio}`}</span>;
  }
  return (
    <a href={destino} className={className}>
      {children ?? `${usuario}@${dominio}`}
    </a>
  );
}
