import { motion } from 'framer-motion'

// Pochita for page 2 - positioned to the right of X-ray dashboard
export default function PochitaPage2() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [-5, 5, -5]
      }}
      transition={{
        opacity: { duration: 1, delay: 0.5 },
        scale: { duration: 1, delay: 0.5 },
        y: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
      }}
      className="fixed bottom-12 right-12 z-20 pointer-events-none"
    >
      <img
        src="https://d3ro18w755ioec.cloudfront.net/assets/pochita-unscreen.gif"
        alt="Pochita"
        className="h-44 w-auto"
      />
    </motion.div>
  )
}
