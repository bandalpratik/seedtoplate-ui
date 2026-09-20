import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from './useAuth';
import { ROLE } from '../../lib/constants';
import { ROUTES } from '../../app/routes';
import { Button, CropArtwork, useToast } from '../../components/ui';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValid = /^\d{10}$/.test(phoneNumber);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    try {
      const identified = await signIn({ phoneNumber, fullName: fullName.trim() || undefined });
      // Admins land in the ops console unless they deep-linked somewhere else.
      const target =
        location.state?.from?.pathname ??
        (identified?.role === ROLE.ADMIN ? ROUTES.admin : ROUTES.dashboard);
      navigate(target, { replace: true });
    } catch (error) {
      toast.error(error.userMessage || 'Could not sign you in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-full flex-col">
      <div className="relative h-[min(40vh,330px)] min-h-[220px] overflow-hidden">
        <CropArtwork cropName="default" alt="" className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-leaf-900/50 to-leaf-900" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-0 bottom-0 px-6 pb-8"
        >
          <h1 className="display-xl text-white">
            Seed
            <br />
            &amp; Plate
          </h1>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-9"
      >
        <p className="text-[15px] leading-relaxed text-gray-500">
          Your number is how we reach you when a harvest is ready. No password, no spam.
        </p>

        <form onSubmit={handleSubmit} className="mt-8">
          <label htmlFor="phone" className="eyebrow text-clay">
            Mobile number
          </label>
          <div className="mt-2.5 flex items-center gap-2.5 rounded-2xl bg-bone px-4 py-4 ring-1 ring-transparent transition-shadow focus-within:ring-leaf-200">
            <span className="numeric text-[15px] text-gray-400">+91</span>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="98765 43210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="numeric w-full bg-transparent text-[17px] tracking-[0.02em] text-ink outline-none placeholder:text-gray-300"
            />
          </div>

          <label htmlFor="name" className="eyebrow mt-6 block text-clay">
            Name <span className="normal-case tracking-normal text-gray-300">(optional)</span>
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="How should we address you?"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-2.5 w-full rounded-2xl bg-bone px-4 py-4 text-[17px] text-ink outline-none ring-1 ring-transparent transition-shadow placeholder:text-gray-300 focus:ring-leaf-200"
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            className="mt-8"
            disabled={!isValid}
            loading={submitting}
          >
            Continue
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
