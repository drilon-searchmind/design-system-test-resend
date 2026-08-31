/** Public feature status — no CRM shell, no auth required. */
export default function FeatureStatusLayout({ children }) {
  return (
    <div data-surface="marketing-tally" className="flex min-h-screen flex-1 flex-col">
      {children}
    </div>
  );
}
