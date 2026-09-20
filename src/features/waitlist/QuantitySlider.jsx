import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { cx } from '../../lib/format';

function snap(value, { min, max, step }) {
  const stepped = Math.round((value - min) / step) * step + min;
  return Number(Math.min(Math.max(stepped, min), max).toFixed(2));
}

/**
 * The "buttery-smooth" reservation slider. Drag, tap, or arrow-key the track;
 * every step change fires a light haptic on supporting devices.
 */
export default function QuantitySlider({ value, onChange, min, max, step, disabled = false }) {
  const trackRef = useRef(null);
  const lastValueRef = useRef(value);
  const [dragging, setDragging] = useState(false);

  const range = Math.max(max - min, step);
  const percent = ((value - min) / range) * 100;

  const setFromClientX = useCallback(
    (clientX) => {
      const track = trackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      const next = snap(min + ratio * range, { min, max, step });

      if (next !== lastValueRef.current) {
        lastValueRef.current = next;
        if (navigator.vibrate) navigator.vibrate(4);
        onChange(next);
      }
    },
    [min, max, step, range, onChange],
  );

  useEffect(() => {
    lastValueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!dragging) return undefined;

    const handleMove = (event) => {
      event.preventDefault();
      setFromClientX(event.touches ? event.touches[0].clientX : event.clientX);
    };
    const stop = () => setDragging(false);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, [dragging, setFromClientX]);

  const nudge = (delta) => onChange(snap(value + delta, { min, max, step }));

  const handleKeyDown = (event) => {
    const map = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: step * 5,
      PageDown: -step * 5,
    };
    if (event.key === 'Home') return onChange(min);
    if (event.key === 'End') return onChange(max);
    if (map[event.key] === undefined) return undefined;
    event.preventDefault();
    return nudge(map[event.key]);
  };

  return (
    <div className={cx(disabled && 'pointer-events-none opacity-50')}>
      <div className="flex items-end justify-center gap-1">
        <motion.span
          key={value}
          initial={{ scale: 0.94, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 26 }}
          className="numeric text-[64px] font-light leading-none tracking-[-0.04em] text-ink"
        >
          {Number.isInteger(value) ? value : value.toFixed(1)}
        </motion.span>
        <span className="pb-2 text-lg font-medium text-gray-400">kg</span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Reservation quantity in kilograms"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} kilograms`}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setDragging(true);
          setFromClientX(event.clientX);
        }}
        className="relative mt-9 h-12 cursor-grab touch-none select-none active:cursor-grabbing"
      >
        <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full bg-gray-100">
          <motion.div
            className="h-full rounded-full bg-leaf-900"
            animate={{ width: `${percent}%` }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          />
        </div>

        <motion.div
          className="absolute top-1/2 -translate-y-1/2"
          animate={{ left: `${percent}%`, scale: dragging ? 1.12 : 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          style={{ x: '-50%' }}
        >
          <div className="h-8 w-8 rounded-full border border-black/[0.06] bg-white shadow-lift">
            <span className="mx-auto mt-[11px] block h-1.5 w-1.5 rounded-full bg-leaf-900" />
          </div>
        </motion.div>
      </div>

      <div className="numeric mt-1 flex justify-between text-[11px] text-gray-400">
        <span>{min} kg</span>
        <span>{max} kg max</span>
      </div>
    </div>
  );
}
