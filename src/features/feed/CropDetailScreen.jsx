import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, useScroll, useTransform } from 'motion/react';
import { ChevronLeft, Leaf, MapPin } from 'lucide-react';
import { getBatchReleases, getCropFeed, getCropTimeline } from '../../api/crops';
import { CROP_STAGE_LABEL, PRICE_RULE } from '../../lib/constants';
import { formatCurrency, formatDate, formatKg } from '../../lib/format';
import { ROUTES } from '../../app/routes';
import {
  Button,
  CropArtwork,
  ErrorState,
  ListSkeleton,
  PriceBandBar,
  Reveal,
  StageRail,
  Tag,
} from '../../components/ui';

function StoryHeader({ data }) {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 400], [0, 90]);
  const scale = useTransform(scrollY, [-200, 0], [1.25, 1]);

  const label = `${data.variety ?? data.seedVariety ?? ''} ${data.cropName}`.trim();

  return (
    <section className="relative h-[min(60vh,470px)] min-h-[360px] overflow-hidden bg-leaf-900">
      <motion.div style={{ y, scale }} className="absolute inset-0">
        <CropArtwork cropName={data.cropName} alt={label} className="h-full w-full" />
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-leaf-900/85" />

      <button
        type="button"
        onClick={() => navigate(ROUTES.feed)}
        aria-label="Back to the feed"
        className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-xl transition-colors hover:bg-black/35"
      >
        <ChevronLeft size={20} strokeWidth={2.2} />
      </button>

      <div className="absolute inset-x-0 bottom-0 px-6 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Tag tone="glass" icon={Leaf}>Chemical-Free</Tag>
            <Tag tone="glass" icon={MapPin}>Wai Farm</Tag>
            <Tag tone="glass">{CROP_STAGE_LABEL[data.currentStage]}</Tag>
          </div>
          <h1 className="display-xl text-white">{label}</h1>
        </motion.div>
      </div>
    </section>
  );
}

/**
 * The pricing evidence: either the band we are promising, or — once slices have
 * gone out — the actual per-tranche history, which is the honest version.
 */
function PricePanel({ batch, releases }) {
  const navigate = useNavigate();
  const hasReleases = releases && releases.length > 0;
  const hasFixedPrice = Number(batch?.finalRetailPricePerKg ?? 0) > 0;

  return (
    <div className="mt-12 rounded-[28px] bg-white p-6 shadow-card ring-1 ring-black/[0.04]">
      <p className="eyebrow text-clay">Pricing</p>
      <p className="mt-2 text-[15px] leading-relaxed text-ink">
        {hasFixedPrice
          ? 'This stock is already with us and the selling price is locked.'
          : PRICE_RULE}
      </p>

      {hasFixedPrice && !hasReleases && (
        <p className="numeric mt-5 text-[24px] font-semibold tracking-tight text-ink">
          {formatCurrency(batch.finalRetailPricePerKg)}/kg
        </p>
      )}

      {hasReleases && (
        <ol className="mt-6 space-y-0">
          {releases.map((release, i) => (
            <li
              key={release.id}
              className={`flex items-center justify-between py-3 ${
                i > 0 ? 'border-t border-black/[0.05]' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="numeric flex h-7 w-7 items-center justify-center rounded-full bg-bone text-[12px] font-semibold text-ink">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="numeric text-[13px] text-gray-500">
                  {formatKg(release.releasedKg)} · {formatDate(release.releasedAt)}
                </span>
              </div>
              <span className="numeric text-[15px] font-semibold text-ink">
                {formatCurrency(release.pricePerKg)}/kg
              </span>
            </li>
          ))}
        </ol>
      )}

      {!hasReleases && batch && !hasFixedPrice && (
        <div className="mt-6">
          <PriceBandBar low={batch.estimatedPriceLowPerKg} high={batch.estimatedPriceHighPerKg} />
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate(ROUTES.howWePrice)}
        className="mt-5 cursor-pointer text-[13px] font-medium text-leaf-600 underline underline-offset-4 hover:text-leaf-700"
      >
        How we price
      </button>
    </div>
  );
}

export default function CropDetailScreen() {
  const { batchId } = useParams();
  const navigate = useNavigate();

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['crops', batchId, 'timeline'],
    queryFn: () => getCropTimeline(batchId),
  });

  const { data: feed } = useQuery({
    queryKey: ['crops', 'feed'],
    queryFn: () => getCropFeed({ page: 0, size: 50 }),
  });

  const { data: releases } = useQuery({
    queryKey: ['crops', batchId, 'releases'],
    queryFn: () => getBatchReleases(batchId),
  });

  const batch = (feed?.content ?? []).find((b) => String(b.id) === String(batchId));
  const hasFixedPrice = Number(batch?.finalRetailPricePerKg ?? 0) > 0;

  if (isPending) {
    return (
      <div className="px-5 pt-20">
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-20">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="pb-28">
      <StoryHeader data={data} />

      <div className="px-5 pt-9">
        <Reveal>
          <p className="eyebrow text-clay">Progress</p>
          <StageRail currentStage={data.currentStage} className="mt-4" />
        </Reveal>

        <Reveal>
          <PricePanel batch={batch} releases={releases} />
        </Reveal>

        <Reveal className="mt-12">
          <p className="eyebrow text-clay">The record</p>
          <h2 className="display-lg mt-2 text-ink">Every step, logged.</h2>
        </Reveal>

        <ol className="mt-8">
          {data.timeline.map((event, i) => (
            <Reveal key={event.id} delay={i * 0.05}>
              <li className="relative border-l border-gray-100 pb-10 pl-7 last:border-transparent last:pb-0">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-leaf-600 ring-4 ring-white" />
                <p className="numeric eyebrow text-clay">{formatDate(event.eventDate)}</p>
                <h3 className="mt-2 text-[17px] font-semibold tracking-[-0.015em] text-ink">
                  {event.title}
                </h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-gray-500">
                  {event.description}
                </p>
                <CropArtwork
                  cropName={data.cropName}
                  imageUrl={event.mediaUrl}
                  alt={event.title}
                  className="mt-4 h-44 w-full rounded-2xl"
                />
              </li>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mt-12">
          <Button fullWidth size="lg" onClick={() => navigate(ROUTES.reserve(data.batchId))}>
            {hasFixedPrice ? 'Reserve ready stock' : 'Reserve your share'}
          </Button>
          <p className="mt-3 text-center text-[11px] text-gray-400">
            {hasFixedPrice
              ? 'Price already locked · payment window starts after you reserve'
              : 'Zero cost today · Pay only when it ships'}
          </p>
        </Reveal>
      </div>
    </div>
  );
}
