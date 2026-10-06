/**
 * Etapa EXPLAIN — texto gerado só a partir dos dados do finding.
 * Responde: onde? o que observou? o que era esperado? por que importa?
 */

import type { Finding } from '../model/types';

export function explainFinding(finding: Finding): string {
  const parts = finding.evidence.map((e) => {
    const lines = [`Onde: ${e.reference}.`, `Observado: ${e.observation}.`];
    if (e.expectation) lines.push(`Esperado: ${e.expectation}.`);
    if (e.difference) lines.push(`Diferença: ${e.difference}.`);
    return lines.join(' ');
  });
  return [
    ...parts,
    `Por que importa: ${finding.impact}`,
    `Hipótese (confiança ${Math.round(finding.confidence * 100)}%): ${finding.hypothesis}`,
  ].join('\n');
}
