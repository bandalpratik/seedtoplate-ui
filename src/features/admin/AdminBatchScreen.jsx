import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Scale } from 'lucide-react';
import { addTimelineEvent, getAdminBatchDetail, getAdminBatches } from '../../api/admin';
import { CROP_STAGE, CROP_STAGE_LABEL, hasPhysicalStock } from '../../lib/constants';
import { cx, formatCurrency, formatDate, formatKg } from '../../lib/format';
import { ROUTES } from '../../app/routes';
import {
  Button,
  ErrorState,
  ListSkeleton,
  Reveal,
  Tag,
  useToast,
} from '../../components/ui';
import AdminShell, { StatTile } from './AdminShell';

const STAGES = [
  CROP_STAGE.SOWN,
  CROP_STAGE.GROWING,
  CROP_STAGE.HARVESTED,
  CROP_STAGE.STORED_CURING,
  CROP_STAGE.BATCH_RELEASED,
  CROP_STAGE.DISPATCHED,
  CROP_STAGE.COMPLETE,
];

const field =
  'w-full rounded-2xl bg-white px-4 py-3 text-[15px] text-ink ring-1 ring-black/[0.06] outline-none transition-shadow placeholder:text-gray-300 focus:ring-2 focus:ring-leaf-600';

function EventForm({ batch, onDone }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState(batch.currentStage);
  const [actualYieldKg, setActualYieldKg] = useState('');

  const needsYield = stage === CROP_STAGE.HARVESTED && !batch.actualYieldKg;

  const mutation = useMutation({
    mutationFn: () =>
      addTimelineEvent(batch.id, {
        title,
        description,
        stage,
        actualYieldKg: actualYieldKg ? Number(actualYieldKg) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      toast.success('Logged. Customers can see it now.');
      onDone();
    },
    onError: (err) => toast.error(err.userMessage),
  });

  return (
    <div className="rounded-[22px] bg-white p-4 shadow-card ring-1 ring-black/[0.04]">
      <p className="eyebrow text-clay">New timeline entry</p>

      <input
        className={cx(field, 'mt-3')}
        placeholder="What happened?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className={cx(field, 'mt-2.5 min-h-[76px] resize-none')}
        placeholder="A sentence for the customer"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap gap-1.5">
        {STAGES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStage(s)}
            className={cx(
              'cursor-pointer rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
              stage === s ? 'bg-leaf-900 text-white' : 'bg-gray-100 text-gray-600',
            )}
          >
            {CROP_STAGE_LABEL[s]}
          </button>
        ))}
      </div>

      {needsYield && (
        <div className="mt-3">
          <label className="eyebrow text-clay" htmlFor="yield">
            Weighed-in yield (kg)
          </label>
          <input
            id="yield"
            inputMode="decimal"
            className={cx(field, 'mt-1.5')}
            placeholder="e.g. 468"
            value={actualYieldKg}
            onChange={(e) => setActualYieldKg(e.target.value)}
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
            This replaces the earlier estimate with the real weighed harvest. Storage loss after this point is ours, not theirs.
          </p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button
          fullWidth
          loading={mutation.isPending}
          disabled={!title.trim() || (needsYield && !actualYieldKg)}
          onClick={() => mutation.mutate()}
        >
          Log it
        </Button>
        <Button variant="quiet" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function AdminBatchScreen() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const { data: batches, isPending, error, refetch } = useQuery({
    queryKey: ['admin', 'batches'],
    queryFn: getAdminBatches,
  });

  const { data: story, isPending: storyPending } = useQuery({
    queryKey: ['admin', 'batches', batchId],
    queryFn: () => getAdminBatchDetail(batchId),
  });

  const batch =
    (batches ?? []).find((item) => String(item.id) === String(batchId)) ??
    (story
      ? {
          ...story,
          seedVariety: story.variety,
          unreleasedKg: story.availableYieldKg,
          queueCount: story.queueDepth ?? 0,
          queuedKg: 0,
        }
      : null);

  if (isPending && !batch) {
    return (
      <AdminShell title="Batch" backTo={ROUTES.admin}>
        <ListSkeleton rows={3} />
      </AdminShell>
    );
  }

  if ((error && !batch) || (!batch && !storyPending)) {
    return (
      <AdminShell title="Batch" backTo={ROUTES.admin}>
        <ErrorState error={error} onRetry={refetch} />
      </AdminShell>
    );
  }

  const canRelease = Boolean(batch.actualYieldKg) && batch.queueCount > 0;
  const physicalStock = hasPhysicalStock(batch.currentStage);
  const hasFixedPrice = Number(batch.finalRetailPricePerKg ?? 0) > 0;

  return (
    <AdminShell
      eyebrow={CROP_STAGE_LABEL[batch.currentStage]}
      title={`${batch.variety ?? batch.seedVariety ?? ''} ${batch.cropName}`.trim()}
      backTo={ROUTES.admin}
    >
      <div className="flex gap-3">
        <StatTile
          label={physicalStock ? 'In hand' : 'Expected yield'}
          value={
            physicalStock
              ? batch.actualYieldKg
                ? formatKg(batch.unreleasedKg)
                : '—'
              : formatKg(batch.plannedYieldKg)
          }
          tone="dark"
        />
        <StatTile label="Queue" value={`${batch.queueCount} · ${formatKg(batch.queuedKg)}`} />
      </div>

      <div className="mt-3 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-black/[0.05]">
        <p className="eyebrow text-clay">{hasFixedPrice ? 'Fixed price' : 'Quoted band'}</p>
        <p className="numeric mt-1 text-[18px] font-semibold tracking-tight text-ink">
          {hasFixedPrice
            ? `${formatCurrency(batch.finalRetailPricePerKg)}/kg`
            : batch.estimatedPriceLowPerKg
            ? `${formatCurrency(batch.estimatedPriceLowPerKg)}–${formatCurrency(batch.estimatedPriceHighPerKg)}/kg`
            : 'No band set'}
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
          {hasFixedPrice
            ? 'This batch already has a locked selling price, so customers can move straight to payment.'
            : physicalStock
              ? 'Price a slice above the ceiling and every reservation in it cancels free.'
              : 'Until harvest is weighed, this batch is running on estimated yield rather than physical stock.'}
        </p>
      </div>

      <Button
        fullWidth
        size="lg"
        className="mt-4"
        disabled={!canRelease || hasFixedPrice}
        onClick={() => navigate(ROUTES.adminRelease(batch.id))}
      >
        <Scale size={16} strokeWidth={2.1} />
        {hasFixedPrice
          ? 'Fixed-price stock does not use slices'
          : canRelease
          ? 'Release a slice'
          : batch.actualYieldKg
            ? 'Nobody in the queue yet'
            : 'Record the weigh-in first'}
      </Button>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <p className="eyebrow text-clay">Timeline</p>
          {!adding && (
            <Button size="sm" variant="quiet" onClick={() => setAdding(true)}>
              <Plus size={14} strokeWidth={2.4} />
              Add
            </Button>
          )}
        </div>

        {adding && (
          <div className="mt-3">
            <EventForm batch={batch} onDone={() => setAdding(false)} />
          </div>
        )}

        <ol className="mt-5">
          {(story?.timeline ?? []).map((event, i) => (
            <Reveal key={event.id} delay={i * 0.04}>
              <li className="relative border-l border-gray-200 pb-7 pl-6 last:border-transparent last:pb-0">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-leaf-600 ring-4 ring-bone" />
                <div className="flex items-center gap-2">
                  <p className="numeric eyebrow text-clay">{formatDate(event.eventDate)}</p>
                  <Tag tone="muted">{CROP_STAGE_LABEL[event.stage]}</Tag>
                </div>
                <h3 className="mt-1.5 text-[15px] font-semibold tracking-[-0.015em] text-ink">
                  {event.title}
                </h3>
                {event.description && (
                  <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                    {event.description}
                  </p>
                )}
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </AdminShell>
  );
}
