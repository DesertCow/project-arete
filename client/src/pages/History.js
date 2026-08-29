import usePageTitle from '../hooks/usePageTitle.js';

export default function History() {
  usePageTitle('Training History');

  return (
    <div className="placeholder-page">
      <h1>Training History</h1>
      <p>Your completed training log will appear here.</p>
    </div>
  );
}
