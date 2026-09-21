import { HojeItem } from '@/lib/hojeFoundation';

// Fixture genérica de exemplo — Local State, não persistida. Não representa a rotina real de
// nenhum usuário (diferente do `ROTINA_PADRAO` hardcoded do legacy `minha-vida`, que foi
// deliberadamente descartado por ser pessoal demais para virar fixture de produto).
export const hojeFixtureItems: HojeItem[] = [
  { id: 'h1', title: 'Leitura & planejamento do dia', category: 'pessoal', startMinutes: 7 * 60, durationMinutes: 30 },
  { id: 'h2', title: 'Bloco de estudo focado', category: 'estudo', startMinutes: 8 * 60, durationMinutes: 90 },
  { id: 'h3', title: 'Execução de tarefas prioritárias', category: 'trabalho', startMinutes: 10 * 60, durationMinutes: 120 },
  { id: 'h4', title: 'Caminhada / pausa ativa', category: 'saude', startMinutes: 13 * 60, durationMinutes: 30 },
  { id: 'h5', title: 'Sessão de revisão e correções', category: 'trabalho', startMinutes: 14 * 60, durationMinutes: 90 },
  { id: 'h6', title: 'Encerramento e descanso', category: 'descanso', startMinutes: 19 * 60, durationMinutes: 60 },
];
