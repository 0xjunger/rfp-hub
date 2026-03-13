'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-view">
      <h1>Something broke</h1>
      <p>{error.message || 'An unexpected error occurred.'}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
