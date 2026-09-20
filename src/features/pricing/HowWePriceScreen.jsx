import { ArrowRight, Scale, ShieldCheck, Timer, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PRICE_RULE } from '../../lib/constants';
import { ROUTES } from '../../app/routes';
import { Button, Reveal, Screen } from '../../components/ui';

const TRANCHE_EXAMPLE = [
  { slice: 'A', kg: 200, date: '12 Oct', price: '₹92' },
  { slice: 'B', kg: 200, date: '2 Nov', price: '₹104' },
  { slice: 'C', kg: 240, date: '24 Nov', price: '₹118' },
];

const PROMISES = [
  {
    icon: Scale,
    title: 'Priced the day it leaves the store',
    body: 'A batch sits in our store and goes out in slices. Each slice is priced against the market on the day it is packed — not months earlier, when nobody knows what the crop will do.',
  },
  {
    icon: Timer,
    title: 'Reserving early puts you first',
    body: 'Slices are filled strictly in the order people joined the queue. Earlier reservations go out in the earlier slices, which are usually the cheaper ones.',
  },
  {
    icon: ShieldCheck,
    title: 'The ceiling is a real promise',
    body: 'We show an expected range before you reserve. If the market pushes the price above the top of that range, your reservation is cancelled free. You are never billed a number you did not see coming.',
  },
  {
    icon: Truck,
    title: 'One number, nothing bolted on',
    body: 'Packing and the drive from Wai are already inside the per-kilo price. No delivery fee, no handling fee, no surprises at checkout.',
  },
];

export default function HowWePriceScreen() {
  const navigate = useNavigate();

  return (
    <Screen eyebrow="No small print" title="How we price" backTo={ROUTES.feed}>
      <Reveal>
        <div className="grain mt-6 rounded-[28px] bg-leaf-900 px-6 py-8 text-white">
          <p className="eyebrow text-white/40">The whole rule</p>
          <p className="display-md mt-3 text-white">{PRICE_RULE}</p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="mt-8">
          <p className="eyebrow text-clay">What that looks like</p>
          <p className="mt-2 text-[14px] leading-relaxed text-gray-500">
            640 kg of onion goes into the store. It leaves in three slices, each priced on its own
            day:
          </p>

          <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-black/[0.06]">
            {TRANCHE_EXAMPLE.map(({ slice, kg, date, price }, i) => (
              <div
                key={slice}
                className={`flex items-center justify-between bg-white px-4 py-3.5 ${
                  i > 0 ? 'border-t border-black/[0.05]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="numeric flex h-7 w-7 items-center justify-center rounded-full bg-bone text-[12px] font-semibold text-ink">
                    {slice}
                  </span>
                  <span className="numeric text-[14px] text-gray-500">
                    {kg} kg · {date}
                  </span>
                </div>
                <span className="numeric text-[15px] font-semibold text-ink">{price}/kg</span>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[12px] leading-relaxed text-gray-400">
            Everyone inside a slice pays the same rate. Which slice you land in depends only on when
            you joined the queue.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 space-y-7">
        {PROMISES.map(({ icon: Icon, title, body }, i) => (
          <Reveal key={title} delay={i * 0.06}>
            <div className="border-t border-black/[0.06] pt-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf-50 text-leaf-700">
                <Icon size={17} strokeWidth={2} />
              </span>
              <h3 className="mt-3 text-[17px] font-semibold tracking-[-0.015em] text-ink">
                {title}
              </h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-gray-500">{body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-10">
        <Button fullWidth size="lg" onClick={() => navigate(ROUTES.feed)}>
          See what is growing
          <ArrowRight size={16} strokeWidth={2.2} />
        </Button>
      </Reveal>
    </Screen>
  );
}
