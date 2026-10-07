/**
 * O que a Dynamic Island mostra quando não há notificação transitória: só o que existe
 * de verdade no Personal OS. Antes, fora de 4 domínios, ela exibia a fixture
 * "Foco Contínuo · Revisão de Rotina · 32 min" mesmo sem compromisso nenhum.
 * Usado pela ilha do desktop e do celular (uma regra só).
 */
import type { IslandFixture } from '@/types/shell';
import type { PersonalOS } from '@/foundation/runtime/personalOS';

function minutesBetween(fromIso: string, toIso: string): number {
  return Math.max(0, Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 60000));
}

export function routeIslandDefault(base: IslandFixture, route: string, os: PersonalOS): IslandFixture {
  switch (route) {
    case 'financas':
      return { ...base, tag: 'FINANÇAS · EXEMPLO', desc: 'Sem banco conectado · Open Finance bloqueado', timerBadge: 'EXEMPLO', badgeType: 'support' };
    case 'corpo': {
      const sessions = os.body.sessions();
      return {
        ...base,
        tag: 'CORPO',
        desc: sessions.length ? `${sessions.length} treino(s) registrado(s)` : 'Nenhum treino registrado ainda',
        timerBadge: sessions.length ? `${sessions[0].startedAt.slice(8, 10)}/${sessions[0].startedAt.slice(5, 7)}` : 'SEM REGISTRO',
        badgeType: 'secondary',
      };
    }
    case 'guardian': {
      const pending = os.actionViews(100).filter((a) => a.state === 'aguardando_aprovacao').length;
      return {
        ...base,
        tag: 'GUARDIAN',
        desc: pending ? `${pending} ação(ões) aguardando aprovação` : 'Nenhuma ação pendente',
        timerBadge: pending ? `${pending} PENDENTE${pending > 1 ? 'S' : ''}` : 'EM DIA',
        badgeType: 'primary',
      };
    }
    case 'espiritual': {
      const presence = os.spiritual.presence();
      return { ...base, tag: 'ESPIRITUAL', desc: presence.message, timerBadge: presence.presentToday ? 'PRESENTE HOJE' : 'SEM REGISTRO HOJE', badgeType: 'accent' };
    }
    default: {
      // Hoje, Agenda, Educação, Progresso: o compromisso real de agora (ou o próximo), via Context Aggregator.
      const today = os.todayContext();
      const data = today.status === 'ready' || today.status === 'partial' ? today.data : undefined;
      const now = os.now();
      if (data?.agora) {
        const left = data.agora.endIso ? minutesBetween(now, data.agora.endIso) : undefined;
        return { ...base, tag: 'AGORA', desc: data.agora.title, timerBadge: left !== undefined ? `${left} min` : 'EM CURSO', badgeType: 'primary' };
      }
      if (data?.proximo) {
        const m = data.proximo.minutesUntilStart;
        return { ...base, tag: 'PRÓXIMO', desc: data.proximo.title, timerBadge: m !== undefined ? `em ${m} min` : 'HOJE', badgeType: 'secondary', primaryAction: undefined, secondaryAction: undefined };
      }
      return { ...base, tag: 'HOJE', desc: 'Nada em andamento agora', timerBadge: 'LIVRE', badgeType: 'secondary', primaryAction: undefined, secondaryAction: undefined };
    }
  }
}
