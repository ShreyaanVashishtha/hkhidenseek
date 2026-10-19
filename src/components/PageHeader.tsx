import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
}

export function PageHeader({ title, description, icon: Icon, badge }: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-1.5 pb-3 border-b border-slate-800/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-sky-400 shadow-md">
              <Icon className="h-6 w-6" />
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase font-mono">
              {title}
            </h1>
            {description && (
              <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        {badge && (
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-900 text-sky-400 border border-sky-500/30">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
