import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui';
import { ROUTES } from './routes';

export default function NotFoundScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="That link has gone fallow. Head back to the farm feed."
        action="Back to feed"
        onAction={() => navigate(ROUTES.feed)}
      />
    </div>
  );
}
