import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import './index.css';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}>!</span>
          </div>
          <h2 style={{ fontSize: 18, color: '#1e293b', marginBottom: 8 }}>A aparut o eroare neasteptata</h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Va rugam reincarcati pagina.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 24px', background: '#0d9488', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
          >
            Reincarcare
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
