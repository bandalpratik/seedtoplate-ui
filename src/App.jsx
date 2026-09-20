import Router from './app/Router';
import QueryProvider from './app/QueryProvider';
import ErrorBoundary from './app/ErrorBoundary';
import { AuthProvider } from './features/auth/AuthContext';
import { ToastProvider } from './components/ui';

export default function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <ToastProvider>
            <Router />
          </ToastProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
