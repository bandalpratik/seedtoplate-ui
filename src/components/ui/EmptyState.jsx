import Button from './Button';

export default function EmptyState({ icon: Icon, title, description, action, onAction }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      {Icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-leaf-50">
          <Icon size={26} strokeWidth={1.8} className="text-leaf-600" />
        </div>
      )}
      <h3 className="display-md text-ink">{title}</h3>
      {description && (
        <p className="mt-2.5 max-w-[17rem] text-[14px] leading-relaxed text-gray-500">
          {description}
        </p>
      )}
      {action && (
        <Button className="mt-7" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  );
}
