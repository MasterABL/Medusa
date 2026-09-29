/** Rótulos em português para os códigos do catálogo do domínio (só apresentação). */
export const OPTION_LABEL: Record<string, string> = {
  saude_geral: 'Saúde geral', disposicao: 'Ter mais disposição', forca: 'Ganhar força', mobilidade: 'Mobilidade e alongamento', lazer: 'Lazer e diversão', controle_de_peso: 'Controle de peso',
  caminhada: 'Caminhada', academia: 'Academia', esportes: 'Esportes', yoga_alongamento: 'Yoga e alongamento', ciclismo: 'Ciclismo',
  manha: 'Manhã', almoco: 'Almoço', tarde: 'Tarde', noite: 'Noite',
  casa: 'Em casa', ar_livre: 'Ao ar livre', qualquer: 'Tanto faz',
  tenho_academia: 'Tenho academia', tenho_equipamento_em_casa: 'Tenho equipamento em casa', nao_tenho: 'Não tenho',
  iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado',
  caminha_bastante: 'Caminho bastante', sobe_escada: 'Subo escadas', pratica_esporte: 'Pratico algum esporte', nenhum_no_momento: 'Nenhum no momento',
  ruim: 'Ruim', regular: 'Regular', boa: 'Boa', baixa: 'Baixa', moderada: 'Moderada', alta: 'Alta',
  nenhuma_no_momento: 'Nenhuma no momento',
  leve: 'Leve', desafiadora: 'Desafiadora',
};

export function label(code: string): string {
  return OPTION_LABEL[code] ?? code.replace(/_/g, ' ');
}

export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAY_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** Os 4 estágios do plano (BodyPlanStage) com o nome que a pessoa lê. */
export const STAGES = [
  { key: 'diagnostico', name: 'Entender', hint: 'Seu dia, seu ritmo' },
  { key: 'entendimento', name: 'Perfil', hint: 'O que você me disse' },
  { key: 'plano', name: 'Plano', hint: 'Uma proposta enxuta' },
  { key: 'ativacao', name: 'Ativação', hint: 'Começar de verdade' },
] as const;
