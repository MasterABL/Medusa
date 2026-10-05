export interface TopologyNode {
  id: string;
  label: string;
  type: 'vault' | 'workstation' | 'mobile' | 'cloud' | 'key' | 'credentials';
  status: 'nominal' | 'inspecao' | 'alerta';
  ipOrFingerprint: string;
  lastPing: string;
  trafficRate: string;
  latencyMs: number;
  x: number;
  y: number;
}

export interface TopologyLink {
  from: string;
  to: string;
  protocol: string;
  status: 'seguro' | 'ativo' | 'verificando';
  latencyMs: number;
  cipher: string;
}

export interface SecuritySignal {
  id: string;
  timestamp: string;
  source: string;
  severity: 'info' | 'atencao' | 'nominal';
  event: string;
  protocol: string;
}

export interface IncidentEvidence {
  step: number;
  time: string;
  title: string;
  details: string;
  artifactHash?: string;
  actionTaken?: string;
}

export const GUARDIAN_DATA = {
  telemetry: {
    systemHealthScore: 94.2,
    activeThreats: 0,
    activeIncidents: 1,
    monitoredEntities: 7,
    packetInspectionRate: '1.420 pkt/s',
    averageLatencyMs: 4.2,
    lastAuditTime: 'Há 4m · Assinatura Ed25519',
    sentinelStatus: 'Sentinela Operacional · Silenciosa',
  },

  nodes: [
    { id: 'node-vault', label: 'Identity Vault (Master)', type: 'vault', status: 'nominal', ipOrFingerprint: 'ed25519:9f8a...3b', lastPing: 'Agora', trafficRate: '340 pkt/s', latencyMs: 0.8, x: 260, y: 160 },
    { id: 'node-workstation', label: 'Workstation (Ubuntu/Arch)', type: 'workstation', status: 'nominal', ipOrFingerprint: '100.64.0.12 (Tailscale)', lastPing: '1s atrás', trafficRate: '680 pkt/s', latencyMs: 3.4, x: 100, y: 60 },
    { id: 'node-mobile', label: 'Mobile (Secure Enclave)', type: 'mobile', status: 'nominal', ipOrFingerprint: '100.64.0.18 (Tailscale)', lastPing: '2s atrás', trafficRate: '120 pkt/s', latencyMs: 14.2, x: 420, y: 60 },
    { id: 'node-cloud', label: 'Infra Cloud (GCP Hardened)', type: 'cloud', status: 'nominal', ipOrFingerprint: 'us-east1 / VPC Privada', lastPing: '3s atrás', trafficRate: '210 pkt/s', latencyMs: 22.1, x: 440, y: 260 },
    { id: 'node-key', label: 'YubiKey Hardware FIDO2', type: 'key', status: 'nominal', ipOrFingerprint: 'Slot 1: HMAC-SHA1', lastPing: 'Ativo', trafficRate: '8 evt/m', latencyMs: 0.1, x: 80, y: 260 },
    { id: 'node-creds', label: 'KeePassXC / Zero-Knowledge', type: 'credentials', status: 'inspecao', ipOrFingerprint: 'Argon2id · 64 MiB', lastPing: '12s atrás', trafficRate: '14 pkt/s', latencyMs: 1.2, x: 260, y: 300 },
  ] as TopologyNode[],

  links: [
    { from: 'node-vault', to: 'node-workstation', protocol: 'WireGuard mTLS', status: 'seguro', latencyMs: 3.4, cipher: 'ChaCha20-Poly1305' },
    { from: 'node-vault', to: 'node-mobile', protocol: 'Noise IK Handshake', status: 'seguro', latencyMs: 14.2, cipher: 'AES-256-GCM' },
    { from: 'node-vault', to: 'node-cloud', protocol: 'IAM VPC-SC', status: 'seguro', latencyMs: 22.1, cipher: 'TLS 1.3 Strict' },
    { from: 'node-vault', to: 'node-key', protocol: 'CCID / FIDO2', status: 'seguro', latencyMs: 0.1, cipher: 'Hardware Token' },
    { from: 'node-vault', to: 'node-creds', protocol: 'Local IPC Socket', status: 'ativo', latencyMs: 1.2, cipher: 'Argon2id IPC' },
  ] as TopologyLink[],

  recentSignals: [
    { id: 'sig-1', timestamp: '14:22:04', source: 'Workstation', severity: 'nominal', event: 'Renovação de lease WireGuard bem-sucedida', protocol: 'WG / UDP 51820' },
    { id: 'sig-2', timestamp: '14:20:18', source: 'Identity Vault', severity: 'info', event: 'Sincronização de chave mestra Ed25519', protocol: 'Local IPC' },
    { id: 'sig-3', timestamp: '14:18:02', source: 'Workstation', severity: 'atencao', event: 'Handshake TLS 1.2 atípico interceptado e bloqueado', protocol: 'HTTPS / Port 443' },
    { id: 'sig-4', timestamp: '14:15:30', source: 'Mobile', severity: 'nominal', event: 'Desbloqueio biométrico via Secure Enclave', protocol: 'Local Auth' },
    { id: 'sig-5', timestamp: '14:00:00', source: 'Infra Cloud', severity: 'nominal', event: 'Auditoria de políticas IAM VPC-SC concluída', protocol: 'GCP Admin' },
  ] as SecuritySignal[],

  incidentInvestigation: {
    id: 'INC-889',
    title: 'Tentativa de Negociação Criptográfica Insegura (TLS 1.2)',
    source: 'Workstation (Ubuntu/Arch)',
    severity: 'Baixa · Contido',
    timeline: [
      { step: 1, time: '14:18:02', title: 'Sinal Bruto Capturado', details: 'Socket local tentou abrir conexão de telemetria externa solicitando cipher suite TLS_RSA_WITH_AES_128_CBC_SHA.' },
      { step: 2, time: '14:18:03', title: 'Triagem Automática', details: 'Algoritmo classificou como tráfego legado de script Python não-atualizado em /tmp. Zero correspondência com assinaturas de malware.' },
      { step: 3, time: '14:18:05', title: 'Evidência Capturada', details: 'Pacote isolado. Dump de cabeçalho salvo com hash de integridade.', artifactHash: 'sha256:9f83ac127e...bc89' },
      { step: 4, time: '14:19:00', title: 'Revisão do Operador', details: 'Conexão bloqueada preventivamente. Recomendado forçar flag --min-tls-version=TLSv1.3 no ambiente local.', actionTaken: 'Quarentena de socket aplicada' },
    ] as IncidentEvidence[],
  },

  integrityChecklist: [
    { component: 'Hardware Root of Trust (TPM 2.0)', status: 'Verificado', timestamp: 'Há 1h' },
    { component: 'Secure Boot & dm-verity Kernel', status: 'Ativo & Intacto', timestamp: 'Boot 08:30' },
    { component: 'Chaves SSH & FIDO2 Hardware', status: 'Protegidas (PIN OK)', timestamp: 'Há 12m' },
    { component: 'Isolamento de Memória & ASLR', status: 'Habilitado (Kernel Hardened)', timestamp: 'Ativo' },
  ],
};

export const INITIAL_GUARDIAN_DATA = GUARDIAN_DATA;
