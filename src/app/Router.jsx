import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppShell from './AppShell';
import { ROUTES } from './routes';
import RequireAuth from '../features/auth/RequireAuth';
import NotFoundScreen from './NotFoundScreen';
import RouteFallback from './RouteFallback';

const FeedScreen = lazy(() => import('../features/feed/FeedScreen'));
const CropDetailScreen = lazy(() => import('../features/feed/CropDetailScreen'));
const ReserveScreen = lazy(() => import('../features/waitlist/ReserveScreen'));
const DashboardScreen = lazy(() => import('../features/dashboard/DashboardScreen'));
const CheckoutScreen = lazy(() => import('../features/checkout/CheckoutScreen'));
const PaymentReturnScreen = lazy(() => import('../features/checkout/PaymentReturnScreen'));
const HowWePriceScreen = lazy(() => import('../features/pricing/HowWePriceScreen'));
const SignInScreen = lazy(() => import('../features/auth/SignInScreen'));

const AdminHomeScreen = lazy(() => import('../features/admin/AdminHomeScreen'));
const AddBatchScreen = lazy(() => import('../features/admin/AddBatchScreen'));
const AdminBatchScreen = lazy(() => import('../features/admin/AdminBatchScreen'));
const ReleaseTrancheScreen = lazy(() => import('../features/admin/ReleaseTrancheScreen'));
const OrdersScreen = lazy(() => import('../features/admin/OrdersScreen'));
const ManifestScreen = lazy(() => import('../features/admin/ManifestScreen'));

const load = (element, { guarded = false, adminOnly = false } = {}) => {
  const suspended = <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
  return guarded || adminOnly ? (
    <RequireAuth adminOnly={adminOnly}>{suspended}</RequireAuth>
  ) : (
    suspended
  );
};

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: ROUTES.feed, element: load(<FeedScreen />) },
      { path: ROUTES.crop(), element: load(<CropDetailScreen />) },
      { path: ROUTES.howWePrice, element: load(<HowWePriceScreen />) },
      { path: ROUTES.signIn, element: load(<SignInScreen />) },

      { path: ROUTES.reserve(), element: load(<ReserveScreen />, { guarded: true }) },
      { path: ROUTES.dashboard, element: load(<DashboardScreen />, { guarded: true }) },
      { path: ROUTES.checkout(), element: load(<CheckoutScreen />, { guarded: true }) },
      { path: ROUTES.paymentReturn(), element: load(<PaymentReturnScreen />, { guarded: true }) },

      { path: ROUTES.admin, element: load(<AdminHomeScreen />, { adminOnly: true }) },
      { path: ROUTES.adminAddBatch, element: load(<AddBatchScreen />, { adminOnly: true }) },
      { path: ROUTES.adminOrders, element: load(<OrdersScreen />, { adminOnly: true }) },
      { path: ROUTES.adminManifest, element: load(<ManifestScreen />, { adminOnly: true }) },
      { path: ROUTES.adminBatch(), element: load(<AdminBatchScreen />, { adminOnly: true }) },
      { path: ROUTES.adminRelease(), element: load(<ReleaseTrancheScreen />, { adminOnly: true }) },

      { path: '*', element: <NotFoundScreen /> },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
