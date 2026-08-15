export function Flash({
  tone = 'ok',
  children,
}: {
  tone?: 'ok' | 'error';
  children: React.ReactNode;
}) {
  if (tone === 'error') {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
        {children}
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-teal-200/80 bg-trigo-muted/70 px-4 py-3 text-sm font-semibold text-trigo-deep">
      {children}
    </div>
  );
}
