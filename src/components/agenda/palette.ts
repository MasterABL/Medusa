/**
 * Medusa — Agenda 24 Pastel/Soft Color System
 *
 * Sistema canônico de cores suaves, elegantes e desaturadas para a Agenda.
 * Projetado para funcionar com legibilidade e harmonia nos 2 temas do Medusa (Round 7 §4: o 3º
 * tema, Sépia, foi removido por decisão explícita do Owner):
 * - Claro (#ECF1ED)
 * - Escuro (#111614)
 *
 * Sem neon, sem saturação agressiva, sem tons infantis.
 */

import { Theme } from '@/types/shell';

export interface PastelColorDefinition {
  id: string;
  name: string;
  swatch: string; // Amostra de cor para o seletor visual
  // Estilos adaptativos por tema
  themes: {
    light: {
      bg: string;
      border: string;
      text: string;
      accent: string;
      subtle: string;
    };
    dark: {
      bg: string;
      border: string;
      text: string;
      accent: string;
      subtle: string;
    };
  };
}

export const PASTEL_PALETTE: PastelColorDefinition[] = [
  {
    id: 'rosa_suave',
    name: 'Rosa Suave',
    swatch: '#F4D6DB',
    themes: {
      light: { bg: '#FDF2F4', border: '#F2CAD1', text: '#883848', accent: '#D97787', subtle: '#FAEDF0' },
      dark: { bg: '#2B1A1E', border: '#4E2A34', text: '#F9D8DF', accent: '#E88B9A', subtle: '#231518' },
    },
  },
  {
    id: 'pessego',
    name: 'Pêssego',
    swatch: '#F9DDCF',
    themes: {
      light: { bg: '#FFF5F0', border: '#FAD5C3', text: '#944723', accent: '#E58352', subtle: '#FDF0E9' },
      dark: { bg: '#2C1B14', border: '#543021', text: '#FADCD0', accent: '#EB9467', subtle: '#24150F' },
    },
  },
  {
    id: 'coral_pastel',
    name: 'Coral Pastel',
    swatch: '#F8D3C8',
    themes: {
      light: { bg: '#FFF2EE', border: '#F6C8BA', text: '#9B412F', accent: '#DE6F59', subtle: '#FDECE6' },
      dark: { bg: '#2D1914', border: '#562C21', text: '#FCD7CD', accent: '#E57E69', subtle: '#25130E' },
    },
  },
  {
    id: 'laranja_claro',
    name: 'Laranja Claro',
    swatch: '#FCE0C7',
    themes: {
      light: { bg: '#FFF7ED', border: '#F9D4AF', text: '#8F501B', accent: '#DD863A', subtle: '#FDF3E5' },
      dark: { bg: '#2D1F13', border: '#53371E', text: '#FBE2CB', accent: '#E4954E', subtle: '#24180E' },
    },
  },
  {
    id: 'ambar',
    name: 'Âmbar',
    swatch: '#F9E5C1',
    themes: {
      light: { bg: '#FEF9EE', border: '#F5DC9F', text: '#7E570E', accent: '#D49B24', subtle: '#FBF4E2' },
      dark: { bg: '#2A2110', border: '#503D1B', text: '#FAE7C5', accent: '#DCAB39', subtle: '#21190A' },
    },
  },
  {
    id: 'amarelo_baunilha',
    name: 'Amarelo Baunilha',
    swatch: '#FBF0C6',
    themes: {
      light: { bg: '#FEFCEB', border: '#F7EAB0', text: '#726315', accent: '#C8AD2F', subtle: '#FAF7DF' },
      dark: { bg: '#292510', border: '#4E461A', text: '#FCF3CD', accent: '#D6BD42', subtle: '#211E0B' },
    },
  },
  {
    id: 'limao_suave',
    name: 'Limão Suave',
    swatch: '#EEF4C4',
    themes: {
      light: { bg: '#FBFDEE', border: '#DFEAA7', text: '#5D6A12', accent: '#A1B728', subtle: '#F6F9DF' },
      dark: { bg: '#222812', border: '#424C1D', text: '#F0F6CD', accent: '#B1C73A', subtle: '#1B200D' },
    },
  },
  {
    id: 'verde_menta',
    name: 'Verde Menta',
    swatch: '#D3F2DC',
    themes: {
      light: { bg: '#F1FBF4', border: '#BBE6C8', text: '#216238', accent: '#4EAA71', subtle: '#E8F7EC' },
      dark: { bg: '#13281B', border: '#234E34', text: '#D7F5DF', accent: '#5EBD83', subtle: '#0E2015' },
    },
  },
  {
    id: 'sage',
    name: 'Sage',
    swatch: '#D2E3D4',
    themes: {
      light: { bg: '#F2F7F3', border: '#BFD4C2', text: '#34573B', accent: '#5E8F67', subtle: '#EAF1EC' },
      dark: { bg: '#19261C', border: '#2D4432', text: '#D7E7D9', accent: '#70A47B', subtle: '#131F16' },
    },
  },
  {
    id: 'pistache',
    name: 'Pistache',
    swatch: '#E2ECC9',
    themes: {
      light: { bg: '#F8FAF0', border: '#D0DFAD', text: '#4B5C26', accent: '#7E9C3E', subtle: '#F0F5E4' },
      dark: { bg: '#1E2713', border: '#394A23', text: '#E5EFD0', accent: '#8EAF4A', subtle: '#17200D' },
    },
  },
  {
    id: 'verde_agua',
    name: 'Verde Água',
    swatch: '#CEF1E6',
    themes: {
      light: { bg: '#EFFBF7', border: '#B3E6D7', text: '#196150', accent: '#3AA78C', subtle: '#E4F6F0' },
      dark: { bg: '#112822', border: '#1F4F42', text: '#D4F5EC', accent: '#46BA9D', subtle: '#0C201A' },
    },
  },
  {
    id: 'turquesa_pastel',
    name: 'Turquesa Pastel',
    swatch: '#C8EDE8',
    themes: {
      light: { bg: '#EDFAF8', border: '#AEE1D9', text: '#175E59', accent: '#37A39A', subtle: '#E2F6F3' },
      dark: { bg: '#102725', border: '#1E4D49', text: '#D0F1EC', accent: '#43B7AC', subtle: '#0C1E1D' },
    },
  },
  {
    id: 'ciano_suave',
    name: 'Ciano Suave',
    swatch: '#C9EAF3',
    themes: {
      light: { bg: '#EEF8FB', border: '#B1DCE9', text: '#16576B', accent: '#3399B6', subtle: '#E4F2F7' },
      dark: { bg: '#10252C', border: '#1D4956', text: '#D0EFF7', accent: '#3EACCC', subtle: '#0C1C22' },
    },
  },
  {
    id: 'azul_ceu',
    name: 'Azul Céu',
    swatch: '#CCE3F8',
    themes: {
      light: { bg: '#EFF6FD', border: '#B5D3F2', text: '#1C5182', accent: '#3B88D1', subtle: '#E5F0FA' },
      dark: { bg: '#122333', border: '#214463', text: '#D4E7FA', accent: '#4998E2', subtle: '#0D1B28' },
    },
  },
  {
    id: 'azul_nevoa',
    name: 'Azul Névoa',
    swatch: '#D3DEE8',
    themes: {
      light: { bg: '#F2F5F8', border: '#BDCBD7', text: '#354A5D', accent: '#5E7B95', subtle: '#E8EDF2' },
      dark: { bg: '#172129', border: '#2B3D4C', text: '#D8E2EB', accent: '#6F8EA8', subtle: '#121920' },
    },
  },
  {
    id: 'azul_lavanda',
    name: 'Azul Lavanda',
    swatch: '#D4DBF7',
    themes: {
      light: { bg: '#F2F4FD', border: '#BEC8F3', text: '#2D3E8A', accent: '#586ED4', subtle: '#E8ECFA' },
      dark: { bg: '#161C33', border: '#2C3765', text: '#DCE2FA', accent: '#697FE2', subtle: '#101528' },
    },
  },
  {
    id: 'indigo_suave',
    name: 'Índigo Suave',
    swatch: '#D9D7F6',
    themes: {
      light: { bg: '#F4F3FC', border: '#C5C1F0', text: '#3D3683', accent: '#6E64CA', subtle: '#EAE8F8' },
      dark: { bg: '#1A1832', border: '#332E61', text: '#DFDCFA', accent: '#7F74D9', subtle: '#141227' },
    },
  },
  {
    id: 'violeta_pastel',
    name: 'Violeta Pastel',
    swatch: '#E4D5F6',
    themes: {
      light: { bg: '#F8F3FD', border: '#D4BCF0', text: '#572E85', accent: '#9558D3', subtle: '#F0E8FA' },
      dark: { bg: '#211532', border: '#412961', text: '#EADCFB', accent: '#A568E4', subtle: '#191026' },
    },
  },
  {
    id: 'lavanda',
    name: 'Lavanda',
    swatch: '#ECD7F5',
    themes: {
      light: { bg: '#FAF3FD', border: '#DEC0EE', text: '#68357E', accent: '#A85EC5', subtle: '#F3E9F8' },
      dark: { bg: '#25152F', border: '#49295C', text: '#EEDDFC', accent: '#B86FDB', subtle: '#1C1024' },
    },
  },
  {
    id: 'malva',
    name: 'Malva',
    swatch: '#E8D4E5',
    themes: {
      light: { bg: '#F8F3F7', border: '#D7BED3', text: '#643C60', accent: '#976192', subtle: '#F0E8EE' },
      dark: { bg: '#241723', border: '#442C43', text: '#EBDCE8', accent: '#A872A2', subtle: '#1C111B' },
    },
  },
  {
    id: 'rosa_antigo',
    name: 'Rosa Antigo',
    swatch: '#EDD4DC',
    themes: {
      light: { bg: '#FAF2F5', border: '#DEBDC8', text: '#743C4E', accent: '#A96178', subtle: '#F3E8EC' },
      dark: { bg: '#26161D', border: '#4C2B39', text: '#EEDCE3', accent: '#B97087', subtle: '#1E1116' },
    },
  },
  {
    id: 'terracota_suave',
    name: 'Terracota Suave',
    swatch: '#F0D6CE',
    themes: {
      light: { bg: '#FBF4F1', border: '#E4C1B6', text: '#7C4334', accent: '#B46A58', subtle: '#F4E9E5' },
      dark: { bg: '#271714', border: '#4F2D26', text: '#F0DCD7', accent: '#C47A67', subtle: '#1F120F' },
    },
  },
  {
    id: 'bege_quente',
    name: 'Bege Quente',
    swatch: '#EFE3D5',
    themes: {
      light: { bg: '#FAF6F1', border: '#DDD0C0', text: '#624F3A', accent: '#957E64', subtle: '#F2ECE4' },
      dark: { bg: '#221D17', border: '#443A2E', text: '#EFE7DE', accent: '#A69076', subtle: '#1B1612' },
    },
  },
  {
    id: 'cinza_lilas',
    name: 'Cinza Lilás',
    swatch: '#E0DEE6',
    themes: {
      light: { bg: '#F5F4F7', border: '#CCC9D6', text: '#4C485A', accent: '#78738C', subtle: '#ECEBF0' },
      dark: { bg: '#1E1C23', border: '#393644', text: '#E5E3EB', accent: '#88849D', subtle: '#17161B' },
    },
  },
];

/**
 * Retorna as variáveis/estilos de cor para um ID de cor e tema ativos.
 * Fallback para 'azul_lavanda' se a cor não for encontrada.
 */
export function getPastelThemeStyle(colorId: string, theme: Theme = 'light') {
  const definition = PASTEL_PALETTE.find((c) => c.id === colorId) || PASTEL_PALETTE[15]; // azul_lavanda fallback
  const currentTheme = theme === 'dark' ? 'dark' : 'light';
  return {
    ...definition.themes[currentTheme],
    id: definition.id,
    name: definition.name,
    swatch: definition.swatch,
  };
}

/**
 * Retorna uma definição de cor pelo ID
 */
export function getPastelColorDefinition(colorId: string): PastelColorDefinition {
  return PASTEL_PALETTE.find((c) => c.id === colorId) || PASTEL_PALETTE[15];
}
