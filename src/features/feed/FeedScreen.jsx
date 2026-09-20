import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, Leaf, MapPin, Sprout } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getCropFeed } from '../../api/crops';
import { CROP_STAGE, hasPhysicalStock } from '../../lib/constants';
import { formatCurrency, formatKg } from '../../lib/format';
import { ROUTES } from '../../app/routes';
import {
  Button,
  CropArtwork,
  CropCardSkeleton,
  EmptyState,
  ErrorState,
  FilterChips,
  Reveal,
  StageRail,
  Tag,
} from '../../components/ui';

function LivePulse() {
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span className="absolute inline-flex h-full w-full rounded-full bg-harvest-400 [animation:pulse-ring_2s_ease-out_infinite]" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-harvest-500" />
    </span>
  );
}

function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 300], [0, 60]);
  const opacity = useTransform(scrollY, [0, 220], [1, 0]);

  return (
    <section className="relative h-[min(78vh,600px)] min-h-[440px] w-full overflow-hidden bg-leaf-900">
      <motion.div style={{ y }} className="absolute inset-0">
        <CropArtwork cropName="default" alt="" className="h-full w-full scale-110" />
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-b from-leaf-900/70 via-leaf-900/20 to-leaf-900" />

      <motion.div
        style={{ opacity }}
        className="relative flex h-full flex-col justify-end px-6 pb-14"
      >
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-md">
            <LivePulse />
            Live from Wai
          </span>

          <h1 className="display-xl mt-5 text-white">
            Food you can
            <br />
            trace to the row
            <br />
            it grew in.
          </h1>

          <p className="mt-4 max-w-[19rem] text-[15px] leading-relaxed text-white/65">
            Chemical-free, native varieties. Reserve while it is still in the ground, pay only when
            it is harvested and weighed.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="mt-9 flex justify-center"
        >
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="h-8 w-[22px] shrink-0 rounded-full border border-white/25"
          >
            <span className="mx-auto mt-2 block h-1.5 w-[3px] rounded-full bg-white/60" />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function PriceBlock({ batch }) {
  const fixedPrice = Number(batch.finalRetailPricePerKg ?? 0);
  const hasFixedPrice = fixedPrice > 0;

  if (hasFixedPrice) {
    return (
      <div>
        <p className="eyebrow text-clay">Ready now</p>
        <p className="numeric mt-1 text-[22px] font-semibold tracking-tight text-ink">
          {formatCurrency(batch.finalRetailPricePerKg)}
          <span className="text-sm font-normal text-gray-400">/kg</span>
        </p>
      </div>
    );
  }

  if (batch.estimatedPriceLowPerKg && batch.estimatedPriceHighPerKg) {
    // A cured batch in the store is days from shipping, not months — say so.
    const imminent = batch.currentStage === CROP_STAGE.STORED_CURING;

    return (
      <div>
        <p className="eyebrow text-clay">{imminent ? 'Expected soon' : 'Expected'}</p>
        <p className="numeric mt-1 text-[22px] font-semibold tracking-tight text-ink">
          {formatCurrency(batch.estimatedPriceLowPerKg)}–
          {formatCurrency(batch.estimatedPriceHighPerKg)}
          <span className="text-sm font-normal text-gray-400">/kg</span>
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow text-clay">Pricing</p>
      <p className="mt-1 text-[15px] text-gray-500">Set when it leaves the store</p>
    </div>
  );
}

function CropCard({ batch, index }) {
  const navigate = useNavigate();
  const soldOut = Number(batch.availableYieldKg) <= 0;
  const hasFixedPrice = Number(batch.finalRetailPricePerKg ?? 0) > 0;
  const physicalStock = hasPhysicalStock(batch.currentStage);
  const label = `${batch.variety ?? batch.seedVariety ?? ''} ${batch.cropName}`.trim();

  return (
    <Reveal delay={index * 0.06}>
      <motion.article
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="overflow-hidden rounded-[28px] bg-white shadow-lift ring-1 ring-black/[0.04]"
      >
        <button
          type="button"
          onClick={() => navigate(ROUTES.crop(batch.id))}
          className="block w-full cursor-pointer text-left"
        >
          <CropArtwork
            cropName={batch.cropName}
            imageUrl={batch.heroImageUrl}
            alt={label}
            className="h-60 w-full"
          >
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
              <div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {batch.isChemicalFree && (
                    <Tag tone="glass" icon={Leaf}>
                      Chemical-Free
                    </Tag>
                  )}
                  {batch.farmName && (
                    <Tag tone="glass" icon={MapPin}>
                      Wai
                    </Tag>
                  )}
                </div>
                <h2 className="display-md text-white">{label}</h2>
              </div>
              {soldOut && <Tag tone="glass">Fully reserved</Tag>}
            </div>
          </CropArtwork>
        </button>

        <div className="p-5">
          {batch.description && (
            <p className="text-[14px] leading-relaxed text-gray-500">{batch.description}</p>
          )}

          <StageRail currentStage={batch.currentStage} className="mt-5" />

          <div className="mt-6 flex items-end justify-between gap-4">
            <PriceBlock batch={batch} />
            <div className="text-right">
              <p className="eyebrow text-clay">{physicalStock ? 'Open to reserve' : 'Reservation room'}</p>
              <p className="numeric mt-1 text-[22px] font-semibold tracking-tight text-ink">
                {formatKg(batch.availableYieldKg)}
              </p>
            </div>
          </div>

          <Button
            fullWidth
            size="lg"
            className="mt-5"
            disabled={soldOut}
            onClick={() => navigate(ROUTES.reserve(batch.id))}
          >
            {soldOut ? 'Fully reserved' : hasFixedPrice ? 'Reserve ready stock' : 'Reserve your share'}
            {!soldOut && <ArrowRight size={16} strokeWidth={2.2} />}
          </Button>

          <p className="mt-3 text-center text-[11px] text-gray-400">
            {hasFixedPrice
              ? 'Price already locked · payment window starts after you reserve'
              : 'Zero cost today · Pay only when it ships'}
          </p>
        </div>
      </motion.article>
    </Reveal>
  );
}

const MANIFESTO = [
  ['Zero-cost intent', 'Reserve while it is still in the ground. Nothing is charged today.'],
  [
    'Priced on the day it ships',
    'A stored batch goes out in slices. Each slice is priced against the market the day it is packed.',
  ],
  ['Driven, not shipped', 'Hand-carried from Wai on the weekend run to Pune and Juinagar.'],
];

function Manifesto() {
  const navigate = useNavigate();

  return (
    <section className="grain mt-16 rounded-[32px] bg-leaf-900 px-7 py-14 text-white">
      <Reveal>
        <p className="eyebrow text-white/40">How it works</p>
        <h2 className="display-lg mt-3 text-white">
          A supply chain
          <br />
          with nothing hidden.
        </h2>
      </Reveal>

      <div className="mt-10 space-y-8">
        {MANIFESTO.map(([title, body], i) => (
          <Reveal key={title} delay={i * 0.08}>
            <div className="border-t border-white/10 pt-5">
              <p className="numeric text-[11px] font-semibold text-harvest-400">
                {String(i + 1).padStart(2, '0')}
              </p>
              <h3 className="mt-2 text-[17px] font-semibold tracking-[-0.015em]">{title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-white/55">{body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.24}>
        <Button
          variant="glass"
          fullWidth
          className="mt-9"
          onClick={() => navigate(ROUTES.howWePrice)}
        >
          Read how we price
          <ArrowRight size={15} strokeWidth={2.2} />
        </Button>
      </Reveal>
    </section>
  );
}

export default function FeedScreen() {
  const [selectedCrop, setSelectedCrop] = useState('ALL');
  const [selectedAvailability, setSelectedAvailability] = useState('ALL');
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['crops', 'feed'],
    queryFn: () => getCropFeed({ page: 0, size: 20 }),
  });

  const batches = data?.content ?? [];
  const cropOptions = useMemo(() => {
    const cropNames = [...new Set(batches.map((batch) => batch.cropName).filter(Boolean))].sort();
    return [{ value: 'ALL', label: `All crops (${batches.length})` }].concat(
      cropNames.map((cropName) => ({
        value: cropName,
        label: `${cropName} (${batches.filter((batch) => batch.cropName === cropName).length})`,
      })),
    );
  }, [batches]);
  const availabilityOptions = useMemo(() => {
    const readyNow = batches.filter((batch) => Number(batch.finalRetailPricePerKg ?? 0) > 0).length;
    const reserveAhead = batches.length - readyNow;
    return [
      { value: 'ALL', label: `All timing (${batches.length})` },
      { value: 'READY_NOW', label: `Ready now (${readyNow})` },
      { value: 'RESERVE_AHEAD', label: `Reserve ahead (${reserveAhead})` },
    ];
  }, [batches]);
  const cropFilteredBatches =
    selectedCrop === 'ALL' ? batches : batches.filter((batch) => batch.cropName === selectedCrop);
  const visibleBatches = cropFilteredBatches.filter((batch) => {
    if (selectedAvailability === 'READY_NOW') {
      return Number(batch.finalRetailPricePerKg ?? 0) > 0;
    }
    if (selectedAvailability === 'RESERVE_AHEAD') {
      return Number(batch.finalRetailPricePerKg ?? 0) <= 0;
    }
    return true;
  });

  return (
    <div className="pb-28">
      <Hero />

      <div className="px-5 pt-12">
        <Reveal>
          <p className="eyebrow text-clay">In the ground now</p>
          <h2 className="display-lg mt-2 text-ink">This season’s batches</h2>
        </Reveal>

        {!isPending && !error && batches.length > 0 && (
          <div className="mt-5 space-y-4">
            <FilterChips
              label="Filter by timing"
              options={availabilityOptions}
              value={selectedAvailability}
              onChange={setSelectedAvailability}
            />
            <FilterChips
              label="Filter by crop"
              options={cropOptions}
              value={selectedCrop}
              onChange={setSelectedCrop}
            />
          </div>
        )}

        <div className="mt-7 space-y-7">
          {isPending && (
            <>
              <CropCardSkeleton />
              <CropCardSkeleton />
            </>
          )}

          {error && <ErrorState error={error} onRetry={refetch} />}

          {!isPending && !error && batches.length === 0 && (
            <EmptyState
              icon={Sprout}
              title="Nothing in the ground yet"
              description="New batches appear here the moment they are sown at the Wai farm."
            />
          )}

          {!isPending && !error && batches.length > 0 && visibleBatches.length === 0 && (
            <EmptyState
              icon={Sprout}
              title="No batches match these filters"
              description="Try another crop or timing filter to see what is currently available."
            />
          )}

          {visibleBatches.map((batch, index) => (
            <CropCard key={batch.id} batch={batch} index={index} />
          ))}
        </div>

        <Manifesto />

        <p className="mt-12 text-center text-[11px] text-gray-400">Seed &amp; Plate · Wai, Satara</p>
      </div>
    </div>
  );
}
