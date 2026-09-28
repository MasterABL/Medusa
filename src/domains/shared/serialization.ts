/**
 * MEDUSA — Serialização compartilhada dos domínios (seção 34)
 *
 * objeto de domínio → envelope serializado → objeto restaurado, sempre com
 * validação na volta: um payload inválido lança em vez de virar estado
 * silenciosamente corrompido. O envelope carrega `schemaVersion` para que um
 * futuro adapter de banco consiga migrar formatos antigos.
 */

export const SCHEMA_VERSION = 1;

export class SerializationError extends Error {}

export interface Envelope<T> {
  schemaVersion: number;
  kind: string;
  data: T;
}

export function serialize<T>(kind: string, data: T): string {
  const envelope: Envelope<T> = { schemaVersion: SCHEMA_VERSION, kind, data };
  return JSON.stringify(envelope);
}

/**
 * `validate` é o validador do próprio domínio — ele lança com erro
 * interpretável se o dado restaurado não obedece às regras do modelo.
 */
export function deserialize<T>(kind: string, payload: string, validate: (value: T) => void): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new SerializationError(`Payload de "${kind}" não é JSON válido.`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new SerializationError(`Payload de "${kind}" precisa ser um envelope (objeto).`);
  }
  const envelope = parsed as Partial<Envelope<T>>;

  if (envelope.schemaVersion !== SCHEMA_VERSION) {
    throw new SerializationError(
      `schemaVersion não suportada para "${kind}": ${String(envelope.schemaVersion)} (esperado ${SCHEMA_VERSION}).`
    );
  }
  if (envelope.kind !== kind) {
    throw new SerializationError(`Envelope é do tipo "${String(envelope.kind)}", esperado "${kind}".`);
  }
  if (envelope.data === undefined || envelope.data === null || typeof envelope.data !== 'object') {
    throw new SerializationError(`Envelope de "${kind}" não contém "data" válido.`);
  }

  validate(envelope.data);
  return envelope.data;
}
