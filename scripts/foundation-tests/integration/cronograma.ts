/**
 * Cronograma ENEM → Agenda: datas reais (nunca 28/09/2026 fixo), sem sobreposição,
 * respeitando compromissos existentes.
 */
import { makeChecker } from '../domains/_helpers';
import { gerarBlocosAgendaSemana, gerarPlanoGenerico, gerarPlano } from '../../../src/components/education/cronogramaPlanner';

const overlaps = (bs: Array<{ date: string; startTime?: string; endTime?: string }>) =>
  bs.some((a, i) => bs.some((b, j) => i !== j && a.date === b.date && a.startTime! < b.endTime! && b.startTime! < a.endTime!));

export function run(): { total: number; fails: number } {
  const { check, result } = makeChecker('cronograma');
  const quarta10h = new Date(2026, 9, 7, 10, 0); // quarta 07/10/2026 10:00
  const plan = gerarPlano({ diasDisponiveis: ['seg', 'qua'], horasPorDia: 3, dataProva: '2026-11-08', dominio: {} }, quarta10h);

  const blocos = gerarBlocosAgendaSemana(plan, ['seg', 'qua'], quarta10h);
  check('C1: nenhuma data no passado', blocos.every((b) => b.date >= '2026-10-07'));
  check('C2: segunda já passou nesta semana → próxima segunda (12/10)', blocos.some((b) => b.date === '2026-10-12'));
  check('C3: hoje só recebe bloco depois de agora', blocos.filter((b) => b.date === '2026-10-07').every((b) => b.startTime! >= '10:15'));
  check('C4: nenhum par de blocos se sobrepõe no mesmo dia (antes todos começavam no horário de pico)', !overlaps(blocos));
  check('C5: blocos ficam só nos dias escolhidos', blocos.every((b) => ['2026-10-07', '2026-10-12'].includes(b.date)));

  const ocupado = [{ date: '2026-10-07', startTime: '14:00', endTime: '17:00' }];
  const comAgenda = gerarBlocosAgendaSemana(plan, ['qua'], quarta10h, ocupado);
  const conflita = comAgenda.some((b) => b.date === '2026-10-07' && b.startTime! < '17:00' && b.endTime! > '14:00');
  check('C6: compromisso existente é respeitado (nenhum bloco por cima de 14:00–17:00)', !conflita && comAgenda.length > 0);

  const semData = gerarBlocosAgendaSemana(gerarPlanoGenerico(), ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']);
  const hojeReal = new Date();
  const hojeIso = `${hojeReal.getFullYear()}-${String(hojeReal.getMonth() + 1).padStart(2, '0')}-${String(hojeReal.getDate()).padStart(2, '0')}`;
  check('C7: sem passar data, usa HOJE de verdade (não a data fixa de fixture)', semData.length > 0 && semData.every((b) => b.date >= hojeIso));
  return result();
}
