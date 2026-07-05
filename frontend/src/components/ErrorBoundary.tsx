import { Component, type ErrorInfo, type ReactNode } from 'react'
import i18n from '@/lib/i18n'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Top-level error boundary.
 *
 * Without this, any exception thrown during render unmounts the whole React
 * tree and leaves a blank white page with no clue as to what failed. This
 * component intercepts those errors and renders a diagnostic panel instead.
 *
 * Styling is intentionally inline (not Tailwind) so the fallback UI renders
 * even when the stylesheet or design system has not loaded.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface the full stack in the console for debugging.
    console.error('[ErrorBoundary] Uncaught error in React tree:', error, info)
  }

  private handleReload = (): void => {
    this.setState({ hasError: false, error: null })
    window.location.assign('/')
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'Inter, system-ui, sans-serif',
            background: '#f4f7fa',
          }}
        >
          <div
            style={{
              maxWidth: '34rem',
              width: '100%',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '2rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {i18n.t('errors.boundaryTitle')}
            </h1>
            <p style={{ color: '#475569', marginTop: '0.5rem', fontSize: '0.875rem' }}>
              {i18n.t('errors.boundaryDesc')}
            </p>
            <pre
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: '#0f172a',
                color: '#f8fafc',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error?.message || i18n.t('errors.unknownError')}
            </pre>
            <button
              onClick={this.handleReload}
              style={{
                marginTop: '1.5rem',
                background: '#224f8b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.625rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {i18n.t('errors.reload')}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary