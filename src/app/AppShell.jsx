import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Sprout, Package } from 'lucide-react';
import { ROUTES } from './routes';
import { cx } from '../lib/format';

const TABS = [
  { to: ROUTES.feed, label: 'Farm', icon: Sprout, end: true },
  { to: ROUTES.dashboard, label: 'Harvests', icon: Package, end: false },
];

/** Focused, single-task flows render without the tab bar. */
const CHROMELESS = [
  /^\/crops\/\d+\/reserve$/,
  /^\/checkout\//,
  /^\/sign-in$/,
  /^\/how-we-price$/,
  /^\/admin/,
];

export default function AppShell() {
  const location = useLocation();
  const scrollContainerRef = useRef(null);
  const showTabs = !CHROMELESS.some((pattern) => pattern.test(location.pathname));

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, [location.pathname]);

  return (
    <div className="flex h-[100dvh] items-center justify-center bg-bone sm:bg-[radial-gradient(120%_120%_at_50%_0%,#FFFFFF_0%,#F2F1EC_55%,#E8E7E1_100%)] sm:p-8">
      {/* Device frame: a real bezel on desktop, edge-to-edge on a phone. */}
      <div
        className={cx(
          'relative flex w-full flex-col overflow-hidden bg-white',
          'h-[100dvh] sm:min-h-0 sm:h-[860px] sm:max-h-[90dvh] sm:max-w-[400px]',
          'sm:rounded-[48px] sm:p-[10px] sm:shadow-device sm:ring-1 sm:ring-black/[0.06]',
          'sm:bg-gradient-to-b sm:from-[#1c1c1e] sm:to-[#0b0b0c]',
        )}
      >
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white sm:rounded-[38px]">
          <main ref={scrollContainerRef} className="no-scrollbar relative flex-1 overflow-y-auto overflow-x-hidden pb-28">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>

          <AnimatePresence>
            {showTabs && (
              <motion.nav
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none absolute inset-x-0 bottom-3 z-50 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))]"
              >
                <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-black/[0.06] bg-white/75 p-1.5 shadow-lift backdrop-blur-2xl">
                  {TABS.map(({ to, label, icon: Icon, end }) => (
                    <NavLink key={to} to={to} end={end} className="relative">
                      {({ isActive }) => (
                        <span
                          className={cx(
                            'relative z-10 flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium transition-colors duration-300',
                            isActive ? 'text-white' : 'text-gray-500 hover:text-gray-800',
                          )}
                        >
                          {isActive && (
                            <motion.span
                              layoutId="tab-pill"
                              className="absolute inset-0 -z-10 rounded-full bg-leaf-900"
                              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                            />
                          )}
                          <Icon size={17} strokeWidth={2} />
                          {label}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
