/**
 * MEDUSA — detecção de texto privado em saída (compartilhado)
 *
 * Usado pelo domínio Espiritual (antes de montar contexto de IA) e pelo
 * Guardian (auditoria de canais de saída): a MESMA regra dos dois lados,
 * para que "vazou" signifique a mesma coisa.
 */

export const MIN_PRIVATE_LENGTH = 12;
const WINDOW = 20;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Heurística de trecho: texto inteiro, ou qualquer janela de 20 caracteres, do privado presente na saída. */
export function leaksPrivateText(privateText: string, outboundText: string): boolean {
  const p = normalize(privateText);
  const o = normalize(outboundText);
  if (p.length < MIN_PRIVATE_LENGTH) return false;
  if (o.includes(p)) return true;
  if (p.length < WINDOW) return false;
  for (let i = 0; i + WINDOW <= p.length; i += 5) {
    if (o.includes(p.slice(i, i + WINDOW))) return true;
  }
  return false;
}
