export default function NpsSurveyLayout({ children }) {
  return (
    <div
      data-surface="marketing-tally"
      className="flex min-h-screen flex-1 flex-col items-center justify-center bg-canvas text-fg"
    >
      {children}
    </div>
  );
}
