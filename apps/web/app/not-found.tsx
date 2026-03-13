export default function NotFound() {
  return (
    <div className="error-view">
      <div className="error-code">404</div>
      <h1>Lost in the void</h1>
      <p>This page doesn't exist, or was moved to another chain.</p>
      <a href="/" className="btn">
        &larr; Back to feed
      </a>
    </div>
  );
}
