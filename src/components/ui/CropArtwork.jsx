import { cx } from '../../lib/format';
import { paletteFor } from './cropPalette';

export default function CropArtwork({ cropName, imageUrl, alt, className, children }) {
  const palette = paletteFor(cropName);

  if (imageUrl) {
    return (
      <div className={cx('relative overflow-hidden', className)}>
        <img src={imageUrl} alt={alt} loading="lazy" className="h-full w-full object-cover" />
        {children}
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={cx('grain relative overflow-hidden', className)}
      style={{ background: palette.base }}
    >
      <div className="absolute inset-0" style={{ background: palette.glow }} />

      {/* Soft organic shapes suggesting rows of a field. */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.22]"
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M-40 ${210 + i * 34} C 90 ${150 + i * 30}, 230 ${262 + i * 26}, 440 ${172 + i * 30}`}
            fill="none"
            stroke="url(#stroke)"
            strokeWidth={1.5}
          />
        ))}
        <circle cx="318" cy="72" r="46" fill="#fff" fillOpacity="0.12" />
      </svg>

      <div
        className="absolute inset-x-0 bottom-0 h-2/3"
        style={{ background: `linear-gradient(to top, ${palette.ink}cc 0%, ${palette.ink}00 100%)` }}
      />

      {children}
    </div>
  );
}
