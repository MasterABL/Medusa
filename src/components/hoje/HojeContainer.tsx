'use client';

import React from 'react';
import { hojeFixtureItems } from '@/fixtures/hojeFixtures';
import {
  groupHojeItems,
  formatMinutes,
  CATEGORY_ICON,
  CATEGORY_LABEL,
  HojeItem,
} from '@/lib/hojeFoundation';

function useNowMinutes(): number | null {
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    const update = () => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  return now;
}

function ItemCard({ item, emphasis }: { item: HojeItem; emphasis?: 'current' | 'next' }) {
  const isCurrent = emphasis === 'current';
  return (
    <div
      className={`flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl border shadow-calm transition-colors ${
        isCurrent
          ? 'bg-medusa-primary/10 border-medusa-primary/40'
          : 'bg-surface border-border/60'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-subtle ${
          isCurrent ? 'bg-medusa-primary text-[#1C2420]' : 'bg-surface-secondary/60 text-text-secondary'
        }`}
      >
        <span className="material-symbols-outlined text-[19px]">{CATEGORY_ICON[item.category]}</span>
      </div>
      <div className="space-y-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            {CATEGORY_LABEL[item.category]}
          </span>
          <span className="text-text-muted/40">•</span>
          <span className="text-[11px] font-mono text-text-muted tabular-nums">
            {formatMinutes(item.startMinutes)}
          </span>
        </div>
        <h4 className="text-[14px] font-semibold text-text-primary tracking-tight truncate">
          {item.title}
        </h4>
        <p className="text-[11px] text-text-muted">{item.durationMinutes} min</p>
      </div>
    </div>
  );
}

function EmptySlot({ label }: { label: string }) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-dashed border-border/60 text-[12px] text-text-muted flex items-center gap-2">
      <span className="material-symbols-outlined text-[16px]">check_circle</span>
      {label}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-text-muted">
        {children}
      </span>
      <div className="h-px bg-border/60 flex-1" />
    </div>
  );
}

const SKELETON_HEIGHTS = [88, 88, 72, 72];

function HojeSkeleton() {
  return (
    <main className="w-full pb-20 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col gap-8 pt-6 flex-1" aria-busy="true" aria-label="Carregando Hoje">
      <div className="h-6 w-40 rounded-full bg-surface-secondary/60 animate-pulse" />
      {SKELETON_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className="w-full rounded-2xl bg-surface-secondary/40 animate-pulse"
          style={{ height: h }}
        />
      ))}
    </main>
  );
}

export function HojeContainer() {
  const nowMinutes = useNowMinutes();

  if (nowMinutes === null) {
    return <HojeSkeleton />;
  }

  const { agora, proximo, depois, maisTarde } = groupHojeItems(hojeFixtureItems, nowMinutes);

  return (
    <main className="w-full pb-20 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col gap-10 pt-6 flex-1 study-stage-enter">
      <section aria-label="Cabeçalho Hoje" className="flex flex-col gap-1 border-b border-border/60 pb-5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-medium tracking-widest uppercase text-text-muted">
            Hoje
          </span>
          <span className="text-text-muted/40">•</span>
          <span className="text-[11px] text-text-secondary tabular-nums">{formatMinutes(nowMinutes)}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
          O que está acontecendo agora
        </h1>
        <p className="text-[12px] text-text-muted mt-1">
          Dados de exemplo desta sessão — nada aqui é salvo ainda.
        </p>
      </section>

      <section aria-label="Agora" className="flex flex-col gap-3">
        <SectionLabel>Agora</SectionLabel>
        {agora ? <ItemCard item={agora} emphasis="current" /> : <EmptySlot label="Nada em andamento agora." />}
      </section>

      <section aria-label="Próximo" className="flex flex-col gap-3">
        <SectionLabel>Próximo</SectionLabel>
        {proximo ? <ItemCard item={proximo} emphasis="next" /> : <EmptySlot label="Nada mais agendado para hoje." />}
      </section>

      {depois.length > 0 && (
        <section aria-label="Depois" className="flex flex-col gap-3">
          <SectionLabel>Depois</SectionLabel>
          <div className="flex flex-col gap-2.5">
            {depois.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {maisTarde.length > 0 && (
        <section aria-label="Mais tarde" className="flex flex-col gap-3">
          <SectionLabel>Mais tarde</SectionLabel>
          <div className="flex flex-col gap-2.5 opacity-80">
            {maisTarde.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
