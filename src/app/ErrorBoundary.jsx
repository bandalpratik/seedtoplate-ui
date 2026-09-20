import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bone px-8 text-center">
        <AlertTriangle size={32} className="text-harvest-500" />
        <h1 className="font-serif text-xl text-gray-800">The app hit a snag</h1>
        <p className="max-w-xs text-sm text-gray-500">
          Reload to get back to the farm feed. If it keeps happening, let us know.
        </p>
        <Button onClick={() => window.location.assign('/')}>Reload</Button>
      </div>
    );
  }
}
