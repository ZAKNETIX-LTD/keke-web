export function PageHeader({
  eyebrow = 'TriGo Ops',
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-trigo">
          {eyebrow}
        </div>
        <h1 className="mt-2 text-[2rem] font-extrabold tracking-[-0.045em] text-ink md:text-[2.35rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm font-medium text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
