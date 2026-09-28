/**
 * MEDUSA — Body Domain — Action Executor
 *
 * Mesmo papel do executor de Finanças: o passo "domain executor" do fluxo
 * insight → proposed action → Guardian → authorization → domain executor.
 *
 * SCHEDULE_WORKOUT / SCHEDULE_LIGHT_ACTIVITY / MOVE_BODY_SESSION não tocam o
 * BodyRepository aqui — quem decide o horário real e cria o item de verdade
 * é a Agenda (seção 15: "Agenda continua responsável pelo tempo"). O papel
 * deste domínio termina na requisição (`adapters/agendaAdapter.ts`).
 */

import type { Action } from '../../../foundation/types/action';
import { BODY_ACTION_TYPES } from '../actions/types';
import type { CreateBodyPlanPayload, PauseBodyPlanPayload, ResumeBodyPlanPayload } from '../actions/types';
import type { BodyRepository } from '../repository/types';

export class BodyExecutionError extends Error {}

export function executeBodyAction(repository: BodyRepository, action: Action): void {
  switch (action.type) {
    case BODY_ACTION_TYPES.CREATE_BODY_PLAN: {
      const payload = action.payload as CreateBodyPlanPayload;
      repository.savePlan(payload.plan);
      return;
    }

    case BODY_ACTION_TYPES.PAUSE_BODY_PLAN: {
      const payload = action.payload as PauseBodyPlanPayload;
      const plan = repository.getPlan(payload.planId);
      if (!plan) throw new BodyExecutionError(`BodyPlan "${payload.planId}" não encontrado.`);
      repository.savePlan({ ...plan, status: 'paused', updatedAt: new Date().toISOString() });
      return;
    }

    case BODY_ACTION_TYPES.RESUME_BODY_PLAN: {
      const payload = action.payload as ResumeBodyPlanPayload;
      const plan = repository.getPlan(payload.planId);
      if (!plan) throw new BodyExecutionError(`BodyPlan "${payload.planId}" não encontrado.`);
      repository.savePlan({ ...plan, status: 'active', updatedAt: new Date().toISOString() });
      return;
    }

    default:
      // SCHEDULE_WORKOUT / SCHEDULE_LIGHT_ACTIVITY / MOVE_BODY_SESSION: o
      // agendamento real é responsabilidade da Agenda, fora do escopo deste
      // executor — chegar aqui não é erro.
      return;
  }
}
