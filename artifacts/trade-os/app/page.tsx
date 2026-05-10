export default function HomePage() {
  return (
    <main>
      <h1>Trade Insight Engine</h1>
      <p>
        Backend scoring runs via Server Actions in <code>app/actions/trading.ts</code>. Connect your existing UI to{" "}
        <code>scoreTradeAction</code> or call <code>@workspace/trading-engine</code> from API routes.
      </p>
    </main>
  );
}
