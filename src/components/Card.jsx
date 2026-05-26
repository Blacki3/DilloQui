import { motion } from 'framer-motion';

export default function Card({ children, className = '', style = {} }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flat-panel ${className}`}
      style={{
        padding: "32px 28px",
        width: "100%",
        maxWidth: "420px",
        position: "relative",
        zIndex: 1,
        ...style
      }}
    >
      {children}
    </motion.div>
  );
}
