import { motion } from 'motion/react';
import { formatCurrency } from '../../lib/format';

/**
 * The expected price band, shown wherever a customer commits without a locked
 * price. Non-binding, but it is the thing that stops checkout being a surprise.
 * The ceiling is a real promise: go above it and the reservation cancels free.
 */
export default function PriceBandBar({ low, high, tone = 'light' }) {
  if (!low || !high) return null;

  const dark = tone === 'dark';

  return (
    <div>
      <p className={dark ? 'eyebrow text-white/40' : 'eyebrow text-clay'}>Expected on release</p>
      <p
        className={`numeric mt-1 text-[22px] font-semibold tracking-tight ${
          dark ? 'text-white' : 'text-ink'
        }`}
      >
        {formatCurrency(low)}–{formatCurrency(high)}
        <span
          className={
            dark ? 'text-sm font-normal text-white/40' : 'text-sm font-normal text-gray-400'
          }
        >
          /kg
        </span>
      </p>

      <div
        className={`relative mt-3 h-1.5 overflow-hidden rounded-full ${
          dark ? 'bg-white/10' : 'bg-gray-100'
        }`}
      >
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ originX: 0 }}
          className="absolute inset-y-0 left-[18%] right-[18%] rounded-full bg-gradient-to-r from-leaf-600 to-harvest-500"
        />
      </div>

      <p className={`mt-2 text-[11px] leading-relaxed ${dark ? 'text-white/40' : 'text-gray-400'}`}>
        We will never bill you above {formatCurrency(high)}/kg. If the market moves past it, your
        reservation is cancelled free.
      </p>
    </div>
  );
}
