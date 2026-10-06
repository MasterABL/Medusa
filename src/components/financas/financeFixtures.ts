export interface IncomeOrigin {
  id: string;
  name: string;
  category: 'provento' | 'contrato' | 'investimento';
  amount: number;
  periodicity: string;
  liquidityDay: string;
  status: 'confirmado' | 'previsto';
}

export interface BudgetEnvelope {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  color: string;
  billsCount: number;
}

export interface UpcomingBill {
  id: string;
  title: string;
  category: string;
  dueDate: string;
  dueDayRelative: string;
  amount: number;
  status: 'pago' | 'agendado' | 'pendente';
  recipient: string;
}

export interface FinancialAccountDetail {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'investment';
  balance: number;
  institution: string;
  liquidity: string;
}

export interface CreditCardDetail {
  id: string;
  name: string;
  brand: string;
  limitTotal: number;
  currentInvoice: number;
  availableLimit: number;
  closingDay: number;
  dueDay: number;
  status: 'aberta' | 'fechada' | 'paga';
}

export interface TransactionRecord {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'inflow' | 'outflow';
  amount: number;
  account: string;
  isAnomaly?: boolean;
}

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadlineLabel: string;
  category: string;
  progressPercent: number;
}

export interface FinancialAnomalyItem {
  id: string;
  title: string;
  description: string;
  amount: number;
  date: string;
  severity: 'alta' | 'media';
  status: 'pendente' | 'contestado' | 'resolvido';
  guardianActionId: string;
}

export const FINANCIAL_ACCOUNTS: FinancialAccountDetail[] = [
  {
    id: 'acc-1',
    name: 'Conta Corrente Principal',
    type: 'checking',
    balance: 14200,
    institution: 'Banco Itaú / Nubank',
    liquidity: 'D+0 Imediata',
  },
  {
    id: 'acc-2',
    name: 'Reserva de Emergência & Oportunidade',
    type: 'savings',
    balance: 20080,
    institution: 'Tesouro Selic / CDB Liquidez Diária',
    liquidity: 'D+0 Imediata',
  },
];

export const CREDIT_CARDS: CreditCardDetail[] = [
  {
    id: 'card-1',
    name: 'Nubank Ultravioleta Mastercard',
    brand: 'Mastercard Black',
    limitTotal: 15000,
    currentInvoice: 1850,
    availableLimit: 13150,
    closingDay: 15,
    dueDay: 22,
    status: 'aberta',
  },
  {
    id: 'card-2',
    name: 'Cartão Reserva Visa Infinite',
    brand: 'Visa Infinite',
    limitTotal: 5000,
    currentInvoice: 320,
    availableLimit: 4680,
    closingDay: 28,
    dueDay: 5,
    status: 'aberta',
  },
];

export const RECENT_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'tx-1',
    date: 'Hoje · 11:42',
    description: 'SaaS Cloud Sync (Debito Duplicado)',
    category: 'Tecnologia',
    type: 'outflow',
    amount: 89.90,
    account: 'Nubank Ultravioleta',
    isAnomaly: true,
  },
  {
    id: 'tx-2',
    date: 'Ontem · 19:15',
    description: 'Supermercado Orgânico',
    category: 'Alimentação',
    type: 'outflow',
    amount: 245.80,
    account: 'Conta Corrente',
  },
  {
    id: 'tx-3',
    date: '04 Out · 14:00',
    description: 'Contrato de Consultoria de Sistemas',
    category: 'Receita',
    type: 'inflow',
    amount: 5650.00,
    account: 'Conta Corrente',
  },
  {
    id: 'tx-4',
    date: '03 Out · 09:30',
    description: 'Aluguel & Condomínio',
    category: 'Moradia',
    type: 'outflow',
    amount: 4300.00,
    account: 'Conta Corrente',
  },
  {
    id: 'tx-5',
    date: '01 Out · 08:00',
    description: 'Salário Mensal Principal',
    category: 'Receita',
    type: 'inflow',
    amount: 14200.00,
    account: 'Conta Corrente',
  },
  {
    id: 'tx-6',
    date: '28 Set · 16:40',
    description: 'Farmácia & Vitaminas',
    category: 'Saúde',
    type: 'outflow',
    amount: 120.50,
    account: 'Nubank Ultravioleta',
  },
];

export const FINANCIAL_GOALS: FinancialGoal[] = [
  {
    id: 'goal-1',
    title: 'Reserva de Emergência Completa (6 meses)',
    targetAmount: 30000,
    currentAmount: 20080,
    deadlineLabel: 'Meta para Jan 2027',
    category: 'Segurança & Solvência',
    progressPercent: 67,
  },
  {
    id: 'goal-2',
    title: 'Viagem de Estudos & Imersão Exterior',
    targetAmount: 8000,
    currentAmount: 4200,
    deadlineLabel: 'Meta para Jul 2027',
    category: 'Experiência & Educação',
    progressPercent: 52,
  },
  {
    id: 'goal-3',
    title: 'Upgrade Estação de Trabalho Ergonômica',
    targetAmount: 6000,
    currentAmount: 6000,
    deadlineLabel: 'Atingida com Sucesso',
    category: 'Equipamento',
    progressPercent: 100,
  },
];

export const FINANCIAL_ANOMALIES: FinancialAnomalyItem[] = [
  {
    id: 'anom-1',
    title: 'Cobrança Duplicada de Streaming SaaS',
    description: 'Dois lançamentos idênticos de R$ 89,90 no mesmo minuto no cartão Nubank.',
    amount: 89.90,
    date: 'Hoje às 11:42',
    severity: 'alta',
    status: 'pendente',
    guardianActionId: 'cobranca-duplicada',
  },
  {
    id: 'anom-2',
    title: 'Variação Atípica de Energia Elétrica (+42%)',
    description: 'Conta deste mês subiu para R$ 480 vs média habitual de R$ 338.',
    amount: 142.00,
    date: '02 Out',
    severity: 'media',
    status: 'resolvido',
    guardianActionId: 'variacao-energia',
  },
];

export const UPCOMING_BILLS: UpcomingBill[] = [
  { id: 'bill-1', title: 'Aluguel & Condomínio', category: 'Moradia', dueDate: '03 Out', dueDayRelative: 'D+03', amount: 4300, status: 'pago', recipient: 'Imobiliária Central' },
  { id: 'bill-2', title: 'Infraestrutura de Nuvem & Domínios', category: 'Tecnologia', dueDate: '05 Out', dueDayRelative: 'D+05', amount: 840, status: 'pago', recipient: 'Google Cloud / Vercel' },
  { id: 'bill-3', title: 'Aporte Tesouro Selic 2029', category: 'Reserva', dueDate: '08 Out', dueDayRelative: 'D+08', amount: 2500, status: 'pago', recipient: 'Tesouro Direto' },
  { id: 'bill-4', title: 'Plano de Saúde & Exames', category: 'Saúde', dueDate: '18 Out', dueDayRelative: 'D+18', amount: 1120, status: 'agendado', recipient: 'Bradesco Saúde' },
  { id: 'bill-5', title: 'Fatura do Cartão Corporativo', category: 'Operação', dueDate: '22 Out', dueDayRelative: 'D+22', amount: 1850, status: 'agendado', recipient: 'Nubank Ultravioleta' },
  { id: 'bill-6', title: 'Energia Elétrica & Fibra Óptica', category: 'Utilidades', dueDate: '26 Out', dueDayRelative: 'D+26', amount: 480, status: 'pendente', recipient: 'Enel / Vivo' },
];

export const FINANCAS_DATA = {
  summary: {
    consolidatedLiquidity: 34280,
    totalMonthlyInflow: 21670,
    totalMonthlyOutflow: 17360,
    freeMarginCurrent: 4310,
    freeMarginPercent: 19.9,
    runwayDays: 204,
    monthPacingDay: 15,
    pacingPercent: 50,
  },
  accounts: FINANCIAL_ACCOUNTS,
  cards: CREDIT_CARDS,
  transactions: RECENT_TRANSACTIONS,
  goals: FINANCIAL_GOALS,
  anomalies: FINANCIAL_ANOMALIES,
  upcomingBills: UPCOMING_BILLS,
};

export const FINANCE_DATA = FINANCAS_DATA;
export const INITIAL_FINANCE_DATA = FINANCAS_DATA;
