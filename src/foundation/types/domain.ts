/**
 * MEDUSA FOUNDATION — Domain model
 *
 * Princípio central (ver docs/MEDUSA_MULTI_DOMAIN_INTELLIGENCE.md):
 * cada domínio é um especialista com identidade própria, mas todos compartilham
 * contexto, tempo, eventos, ações, objetivos, confiança, governança e experiência.
 *
 * Este arquivo define SÓ o contrato. Nenhum domínio real (Finanças, Corpo) tem
 * implementação de produto aqui — ver src/foundation/domains/*.ts para o que já
 * existe de verdade (Educação, Agenda) vs. o que é contrato futuro (Finance, Body).
 */

/**
 * Identificador estável de domínio. Estende-se ao adicionar um domínio novo —
 * nunca ao inventar uma string solta em algum componente.
 */
export type DomainId =
  | 'hoje'
  | 'agenda'
  | 'education'
  | 'guardian'
  | 'finance'
  | 'body'
  | 'spiritual'
  | 'email';

/**
 * Voz e identidade de um domínio. Não é um personagem caricato — a diferença
 * deve aparecer por vocabulário, foco e timing, não por um nome fantasioso.
 * Campos ficam opcionais de propósito: um domínio pode nascer sem persona
 * completa e recebê-la depois, sem quebrar o registro.
 */
export interface DomainPersona {
  id: string;
  domain: DomainId;
  displayName: string;
  voice?: string;
  tone?: string;
  language?: string;
  vocabulary?: string[];
  interactionStyle?: string;
  /** Quão proativamente esse domínio inicia comunicação (ver ProactiveMessage). */
  initiativeLevel?: 'reativo' | 'moderado' | 'proativo';
  visualIdentity?: {
    accentToken?: string; // referencia um token do design system, nunca um hex solto
  };
  motionIdentityId?: string; // referencia DomainMotionProfile.id
  soundProfileId?: string; // referencia DomainSoundProfile.id
  decisionStyle?: string;
}

/**
 * Uma capacidade declarada por um domínio — o que ele SABE fazer, não a
 * implementação em si. `implemented: false` é o marcador explícito de que
 * isto é fundação/contrato, não feature pronta (ver seção "NÃO FAZER AGORA").
 */
export interface DomainCapability {
  id: string;
  domain: DomainId;
  label: string;
  description: string;
  implemented: boolean;
  /** Tipos de Action que esta capability pode originar (ver action.ts). */
  actionTypes?: string[];
}

/**
 * Registro completo de um domínio. `DomainRegistry` valida isso ao registrar.
 */
export interface DomainDefinition {
  id: DomainId;
  label: string;
  icon?: string;
  accentToken?: string;
  route?: string;
  /** true = já existe como aba/feature real hoje; false = fundação para o futuro. */
  isLive: boolean;
  persona?: DomainPersona;
  capabilities: DomainCapability[];
  eventTypes: string[];
  actionTypes: string[];
  motionIdentityId?: string;
  soundProfileId?: string;
  contextPanelId?: string;
}
