"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="dashboard">
      <h1>Unable to open this page</h1>
      <p>Please check your connection and try again.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
