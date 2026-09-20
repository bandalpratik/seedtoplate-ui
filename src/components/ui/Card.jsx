import { cx } from '../../lib/format';

export default function Card({ as: Tag = 'div', elevated = false, className, children, ...props }) {
  return (
    <Tag
      className={cx(
        'overflow-hidden rounded-[26px] bg-white ring-1 ring-black/[0.04]',
        elevated ? 'shadow-lift' : 'shadow-card',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
