import { motion } from 'framer-motion'

// Pochita for page 3 - positioned at side margins
export default function PochitaPage3() {
  return (
    <>
      {/* Left margin Pochita */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{
          opacity: 1,
          x: [0, -10, 0]
        }}
        transition={{
          opacity: { duration: 1, delay: 0.5 },
          x: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
        }}
        className="fixed left-8 top-1/2 transform -translate-y-1/2 z-20 pointer-events-none"
      >
        <img
          src="https://d3ro18w755ioec.cloudfront.net/assets/pochita-unscreen.gif"
          alt="Pochita"
          className="h-40 w-auto"
        />
      </motion.div>

      {/* Right margin Pochita */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{
          opacity: 1,
          x: [0, 10, 0]
        }}
        transition={{
          opacity: { duration: 1, delay: 0.7 },
          x: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
        }}
        className="fixed right-8 top-1/2 transform -translate-y-1/2 z-20 pointer-events-none"
      >
        <img
          src="https://d3ro18w755ioec.cloudfront.net/assets/pochita-unscreen.gif"
          alt="Pochita"
          className="h-28 w-auto transform scale-x-[-1]"
        />
      </motion.div>
    </>
  )
}
