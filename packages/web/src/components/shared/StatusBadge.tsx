import {
  RequestStatus,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_COLORS,
} from '@dunwell/shared';

interface StatusBadgeProps {
  status: RequestStatus;
}

const STATUS_BG_CLASSES: Record<RequestStatus, string> = {
  [RequestStatus.NEW]: 'bg-gray-100 text-gray-700',
  [RequestStatus.OFFERING]: 'bg-blue-50 text-blue-700',
  [RequestStatus.TOUR]: 'bg-violet-50 text-violet-700',
  [RequestStatus.SHORTLIST]: 'bg-amber-50 text-amber-700',
  [RequestStatus.NEGOTIATION]: 'bg-orange-50 text-orange-700',
  [RequestStatus.HOT_SIGNED]: 'bg-red-50 text-red-700',
  [RequestStatus.ON_HOLD]: 'bg-gray-50 text-gray-500',
  [RequestStatus.WON]: 'bg-emerald-50 text-emerald-700',
  [RequestStatus.LOST]: 'bg-red-50 text-red-600',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const label = REQUEST_STATUS_LABELS[status] ?? status;
  const color = REQUEST_STATUS_COLORS[status];
  const bgClass = STATUS_BG_CLASSES[status] ?? 'bg-gray-100 text-gray-700';

  return (
    <span
      className={`badge ${bgClass}`}
      style={color ? { borderLeft: `3px solid ${color}` } : undefined}
    >
      {label}
    </span>
  );
}
