export interface CanonicalSunHour {
  id: string;
  name: string;
  solarTime: string;
  angleDeg: number;
  status: 'guardada' | 'atual' | 'proxima';
  sacredAnchor: string;
}

export interface SpatialAperture {
  id: 'proposito' | 'leitura' | 'estudo' | 'oracao';
  title: string;
  icon: string;
  sacredScripture: string;
  reference: string;
  contemplativeFocus: string;
}

export const ESPIRITUAL_DATA = {
  sanctuaryState: {
    vigilDays: 47,
    currentHourName: 'Vésperas (Crepúsculo)',
    cycleName: 'Semana XXVI · Tempo Comum',
    atmosphere: 'Luz Serena & Recolhimento',
  },

  apertures: [
    {
      id: 'proposito',
      title: 'Altar de Propósito',
      icon: 'flag',
      sacredScripture: 'Ainda que a figueira não floresça, nem haja fruto na vide; o produto da oliveira minta, e os campos não produzam mantimento... todavia eu me alegrarei no Senhor, exultarei no Deus da minha salvação.',
      reference: 'Habacuque 3:17-18',
      contemplativeFocus: 'Fidelidade no ordinário, consagração do labor diário e confiança na providência divina.',
    },
    {
      id: 'leitura',
      title: 'Leitura Sagrada (Lectio)',
      icon: 'auto_stories',
      sacredScripture: 'Lâmpada para os meus pés é a tua palavra, e luz clara para o meu caminho.',
      reference: 'Salmo 119:105',
      contemplativeFocus: 'Escuta reverente da Palavra que transforma o entendimento e purifica o olhar.',
    },
    {
      id: 'estudo',
      title: 'Tradição & Sabedoria',
      icon: 'school',
      sacredScripture: 'Se és verdadeiramente teólogo, orarás; e se oras com verdade, és teólogo.',
      reference: 'Evágrio Pôntico · Filocalia',
      contemplativeFocus: 'Discernimento espiritual guiado pela herança dos Padres da Igreja.',
    },
    {
      id: 'oracao',
      title: 'Oração do Coração',
      icon: 'self_improvement',
      sacredScripture: 'Senhor Jesus Cristo, Filho de Deus, tem misericórdia de mim.',
      reference: 'Oração de Jesus · Tradição Hesicasta',
      contemplativeFocus: 'Descida da mente ao silêncio do coração na presença contínua de Deus.',
    },
  ] as SpatialAperture[],

  solarCycle: [
    { id: 'h-1', name: 'Laudes', solarTime: '06:00', angleDeg: 15, status: 'guardada', sacredAnchor: 'Consagração da Aurora' },
    { id: 'h-2', name: 'Terça', solarTime: '09:00', angleDeg: 45, status: 'guardada', sacredAnchor: 'Fogo sobre o Trabalho' },
    { id: 'h-3', name: 'Sexta', solarTime: '12:00', angleDeg: 90, status: 'guardada', sacredAnchor: 'Memória da Cruz' },
    { id: 'h-4', name: 'Nona', solarTime: '15:00', angleDeg: 135, status: 'guardada', sacredAnchor: 'Hora da Misericórdia' },
    { id: 'h-5', name: 'Vésperas', solarTime: '18:00', angleDeg: 165, status: 'atual', sacredAnchor: 'Luz Serena do Crepúsculo' },
    { id: 'h-6', name: 'Completas', solarTime: '21:30', angleDeg: 180, status: 'proxima', sacredAnchor: 'Entrega da Noite' },
  ] as CanonicalSunHour[],

  intentionsLedger: [
    { id: 'int-1', category: 'Discernimento', text: 'Clareza interior na transição profissional e decisões de vida.', day: '18 Set' },
    { id: 'int-2', category: 'Intercessão', text: 'Paz e saúde física e ânimo para familiares em convalescença.', day: '22 Set' },
    { id: 'int-3', category: 'Gratidão', text: 'Pela perseverança diária e pelo dom da quietude no caos.', day: '25 Set' },
  ],
};

export const INITIAL_SPIRITUAL_DATA = ESPIRITUAL_DATA;
export const SPIRITUAL_DATA = ESPIRITUAL_DATA;
