import React from 'react';

interface DomainHeaderProps {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Slot à direita (badge de proveniência, ação, etc.). */
  aside?: React.ReactNode;
}

export function DomainHeader({ eyebrow, title, subtitle, aside }: DomainHeaderProps) {
  return (
    <header className="dm-header">
      <div className="min-w-0">
        <p className="dm-eyebrow">{eyebrow}</p>
        <h1 className="dm-title">{title}</h1>
        {subtitle && <p className="dm-subtitle">{subtitle}</p>}
      </div>
      {aside && <div className="dm-header-aside">{aside}</div>}
    </header>
  );
}
