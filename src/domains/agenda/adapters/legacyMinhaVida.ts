/**
 * MEDUSA — Agenda — Adapter da rotina fixa do MINHA-VIDA (ROTINA_PADRAO em hoje.js)
 *
 * A rotina legada mistura três coisas que o Medusa separa:
 *  - blocos com início e fim (trabalho, estudo)            -> RoutineBlock 'rotina'
 *  - trajetos (ônibus)                                     -> RoutineBlock 'deslocamento'
 *  - marcos pontuais sem fim (acordar, sair de casa)       -> `milestones`: NÃO ocupam tempo
 * Inventar um fim pra "Acordar" faria ele entrar como bloqueio de tempo livre.
 *
 * Domínio por nome: trabalho -> work, estudo -> education, resto -> personal.
 * É heurística sobre texto livre: por isso devolve também o que não soube
 * classificar, em vez de cair silenciosamente num domínio.
 */

import type { AgendaDomain } from '../../../types/agenda';
import type { RoutineBlock } from '../model/temporal';

export interface LegacyRotinaItem {
  id: string;
  horaInicio: string;
  horaFim: string | null;
  titulo: string;
  diasSemana?: number[];
}

export interface RoutineMilestone {
  id: string;
  label: string;
  time: string;
  daysOfWeek: number[];
}

export interface MappedRoutine {
  blocks: RoutineBlock[];
  milestones: RoutineMilestone[];
  /** ids cujo domínio caiu no padrão 'personal' por não reconhecer o texto. */
  unclassified: string[];
}

const TRAVEL = /(ônibus|onibus|trajeto|desloc|metrô|metro|uber|carona)/i;

function domainOf(titulo: string): { domain: AgendaDomain; recognized: boolean } {
  if (/trabalh|expedient|turno/i.test(titulo)) return { domain: 'work', recognized: true };
  if (/estud|ead|faculdade|ingl[eê]s|enem|aula/i.test(titulo)) return { domain: 'education', recognized: true };
  if (TRAVEL.test(titulo)) return { domain: 'personal', recognized: true };
  return { domain: 'personal', recognized: false };
}

export function mapRoutine(items: LegacyRotinaItem[]): MappedRoutine {
  const blocks: RoutineBlock[] = [];
  const milestones: RoutineMilestone[] = [];
  const unclassified: string[] = [];

  for (const it of items) {
    // Legado: sem `diasSemana` => dias úteis (mesmo fallback do hoje.js).
    const days = it.diasSemana && it.diasSemana.length > 0 ? it.diasSemana : [1, 2, 3, 4, 5];
    if (!it.horaFim) {
      milestones.push({ id: it.id, label: it.titulo, time: it.horaInicio, daysOfWeek: days });
      continue;
    }
    const travel = TRAVEL.test(it.titulo);
    const { domain, recognized } = domainOf(it.titulo);
    if (!recognized) unclassified.push(it.id);
    blocks.push({ id: it.id, label: it.titulo, daysOfWeek: days, startTime: it.horaInicio, endTime: it.horaFim, domain, kind: travel ? 'deslocamento' : 'rotina' });
  }
  return { blocks, milestones, unclassified };
}
