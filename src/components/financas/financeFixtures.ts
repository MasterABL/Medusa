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

export interface CashFlowDay {
  day: string;
  dateStr: string;
  netChange: number;
  projectedBalance: number;
  hasInflow: boolean;
  hasOutflow: boolean;
}

export const FINANCAS_DATA = {
  summary: {
    consolidatedLiquidity: 34280,
    totalMonthlyInflow: 21670,
    totalMonthlyOutflow: 17360,
    freeMarginCurrent: 4310,
    freeMarginPercent: 19.9,
    runwayDays: 204,
    monthPacingDay: 15, // Dia 15 de 30 (50% do mês)
    pacingPercent: 50,
  },

  inflows: [
    { id: 'inf-1', name: 'Salário Principal', category: 'provento', amount: 14200, periodicity: 'Mensal', liquidityDay: 'D+01', status: 'confirmado' },
    { id: 'inf-2', name: 'Contratos & Consultoria', category: 'contrato', amount: 5650, periodicity: 'Variável', liquidityDay: 'D+05', status: 'confirmado' },
    { id: 'inf-3', name: 'Dividendos & FIIs', category: 'investimento', amount: 1820, periodicity: 'Mensal', liquidityDay: 'D+15', status: 'previsto' },
  ] as IncomeOrigin[],

  envelopes: [
    { id: 'env-1', name: 'Custos Fixos (Moradia & Contas)', allocated: 7840, spent: 7840, color: '#71DBD2', billsCount: 6 },
    { id: 'env-2', name: 'Operação & Sustentação (Alimentação/Saúde)', allocated: 3480, spent: 1850, color: '#ADE4B5', billsCount: 14 },
    { id: 'env-3', name: 'Amortização & Dívida Zero', allocated: 2500, spent: 2500, color: '#D0EAA3', billsCount: 1 },
    { id: 'env-4', name: 'Reserva & Investimento Líquido', allocated: 3540, spent: 3540, color: '#FFF18C', billsCount: 2 },
    { id: 'env-5', name: 'Margem Livre de Segurança (Colchão)', allocated: 4310, spent: 0, color: '#18534B', billsCount: 0 },
  ] as BudgetEnvelope[],

  upcomingBills: [
    { id: 'bill-1', title: 'Aluguel & Condomínio', category: 'Moradia', dueDate: '03 Out', dueDayRelative: 'D+03', amount: 4300, status: 'pago', recipient: 'Imobiliária Central' },
    { id: 'bill-2', title: 'Infraestrutura de Nuvem & Domínios', category: 'Tecnologia', dueDate: '05 Out', dueDayRelative: 'D+05', amount: 840, status: 'pago', recipient: 'Google Cloud / Vercel' },
    { id: 'bill-3', title: 'Aporte Tesouro Selic 2029', category: 'Reserva', dueDate: '08 Out', dueDayRelative: 'D+08', amount: 2500, status: 'pago', recipient: 'Tesouro Direto' },
    { id: 'bill-4', title: 'Plano de Saúde & Exames', category: 'Saúde', dueDate: '18 Out', dueDayRelative: 'D+18', amount: 1120, status: 'agendado', recipient: 'Bradesco Saúde' },
    { id: 'bill-5', title: 'Fatura do Cartão Corporativo', category: 'Operação', dueDate: '22 Out', dueDayRelative: 'D+22', amount: 1850, status: 'agendado', recipient: 'Nubank Ultravioleta' },
    { id: 'bill-6', title: 'Energia Elétrica & Fibra Óptica', category: 'Utilidades', dueDate: '26 Out', dueDayRelative: 'D+26', amount: 480, status: 'pendente', recipient: 'Enel / Vivo' },
  ] as UpcomingBill[],

  cashFlowHorizon: [
    { day: 'D+01', dateStr: '1 Out', netChange: 14200, projectedBalance: 34280, hasInflow: true, hasOutflow: false },
    { day: 'D+03', dateStr: '3 Out', netChange: -4300, projectedBalance: 29980, hasInflow: false, hasOutflow: true },
    { day: 'D+05', dateStr: '5 Out', netChange: 4810, projectedBalance: 34790, hasInflow: true, hasOutflow: true },
    { day: 'D+08', dateStr: '8 Out', netChange: -2500, projectedBalance: 32290, hasInflow: false, hasOutflow: true },
    { day: 'D+15', dateStr: '15 Out', netChange: 1820, projectedBalance: 34110, hasInflow: true, hasOutflow: false },
    { day: 'D+18', dateStr: '18 Out', netChange: -1120, projectedBalance: 32990, hasInflow: false, hasOutflow: true },
    { day: 'D+22', dateStr: '22 Out', netChange: -1850, projectedBalance: 31140, hasInflow: false, hasOutflow: true },
    { day: 'D+30', dateStr: '30 Out', netChange: -480, projectedBalance: 30660, hasInflow: false, hasOutflow: true },
  ] as CashFlowDay[],
};

export const FINANCE_DATA = FINANCAS_DATA;
export const INITIAL_FINANCE_DATA = FINANCAS_DATA;
