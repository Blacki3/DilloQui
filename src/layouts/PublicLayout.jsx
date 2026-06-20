import { useOutlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Navbar from '../components/Navbar';

// Layout delle pagine pubbliche (Landing, Chi Siamo).
// La navbar resta FISSA e fuori dall'elemento animato (un transform sull'antenato
// romperebbe il position:fixed). Il contenuto cambia con un blur/fade deciso.
export default function PublicLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const shouldReduceMotion = useReducedMotion();

  return (
    <>
      <Navbar />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, filter: 'blur(4px)', y: 8 }}
          animate={{
            opacity: 1,
            filter: shouldReduceMotion ? 'none' : 'blur(0px)',
            y: shouldReduceMotion ? 0 : 0,
            transition: shouldReduceMotion
              ? { duration: 0.01 }
              : { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
          }}
          exit={{
            opacity: 0,
            filter: shouldReduceMotion ? 'none' : 'blur(4px)',
            y: shouldReduceMotion ? 0 : -6,
            transition: shouldReduceMotion
              ? { duration: 0.01 }
              : { duration: 0.35, ease: [0.4, 0, 1, 1] },
          }}
          style={{ willChange: shouldReduceMotion ? 'opacity' : 'opacity, filter, transform' }}
        >
          {outlet}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
