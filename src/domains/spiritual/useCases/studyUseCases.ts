/**
 * MEDUSA — Spiritual — Casos de uso: estudo bíblico
 */

import { publish as publishEvent } from '../../../foundation/eventBus';
import { formatReference } from '../model/bible';
import type { Study, StudyItem } from '../model/study';
import { SPIRITUAL_EVENT_TYPES } from '../events/types';
import type { SpiritualRepository } from '../repository/types';
import { addStudyItem, concludeStudy, StudyError } from '../services/studyEngine';

function load(repo: SpiritualRepository, id: string): Study {
  const study = repo.getStudy(id);
  if (!study) throw new StudyError(`Estudo "${id}" não encontrado.`);
  return study;
}

export function saveNewStudy(repo: SpiritualRepository, study: Study): Study {
  if (study.purposeId && !repo.getPurpose(study.purposeId)) throw new StudyError(`Propósito "${study.purposeId}" não existe.`);
  repo.saveStudy(study);
  return study;
}

export function addItemToStudy(repo: SpiritualRepository, studyId: string, item: StudyItem): Study {
  const updated = addStudyItem(load(repo, studyId), item);
  repo.saveStudy(updated);
  return updated;
}

export function concludeStudyUseCase(repo: SpiritualRepository, studyId: string, input: { conclusion: StudyItem; nextExploration?: StudyItem; concludedAt: string }): Study {
  const study = concludeStudy(load(repo, studyId), input);
  repo.saveStudy(study);
  publishEvent({
    domain: 'spiritual',
    type: SPIRITUAL_EVENT_TYPES.STUDY_CONCLUDED,
    payload: { studyId: study.id, reference: formatReference(study.reference) },
    dedupeKey: `study-concluded-${study.id}`,
  });
  return study;
}
