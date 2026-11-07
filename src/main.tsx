import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

type BoundaryState = { error: Error | null };

class RuntimeErrorBoundary extends React.Component<React.PropsWithChildren, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    window.dispatchEvent(
      new CustomEvent('cineshelf:boot-error', {
        detail: error?.stack || error?.message || String(error),
      })
    );
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ minHeight: '100vh', background: '#070B14', color: '#e2e8f0', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <section style={{ maxWidth: 640 }}>
            <p style={{ color: '#60a5fa', fontSize: 12, letterSpacing: '.18em', fontWeight: 700 }}>CINESHELF NEXUS</p>
            <h1 style={{ fontSize: 24, margin: '14px 0 8px' }}>The application could not render</h1>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: '#fca5a5', fontSize: 12, lineHeight: 1.6 }}>{this.state.error.stack || this.state.error.message}</pre>
            <button onClick={() => location.reload()} style={{ marginTop: 18, padding: '10px 16px', borderRadius: 8, background: '#2563eb', color: 'white', border: 0, cursor: 'pointer' }}>Reload</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

const BootMarker: React.FC = () => {
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) root.dataset.appMounted = 'true';
    document.getElementById('cineshelf-boot-diagnostic')?.remove();
  }, []);
  return null;
};

const rootNode = document.getElementById('root');
if (!rootNode) {
  throw new Error('CineShelf mount element #root is missing from index.html.');
}

createRoot(rootNode).render(
  <RuntimeErrorBoundary>
    <>
      <App />
      <BootMarker />
    </>
  </RuntimeErrorBoundary>
);
