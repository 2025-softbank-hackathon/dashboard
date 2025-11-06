import { motion } from 'framer-motion'

// Static Pochita images for first page - beside Code Commit and Health Check boxes
export default function PochitaStatic() {
  return (
    <>
      {/* Left Pochita - beside Code Commit */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        className="fixed left-8 top-1/3 z-20 pointer-events-none"
      >
        <img
          src="https://d3ro18w755ioec.cloudfront.net/assets/pochita-unscreen.gif"
          alt="Pochita"
          className="h-32 w-auto"
        />
      </motion.div>

      {/* Right Pochita - beside Health Check */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, type: 'spring' }}
        className="fixed right-8 top-1/3 z-20 pointer-events-none"
      >
        <img
          src="https://d3ro18w755ioec.cloudfront.net/assets/pochita-unscreen.gif"
          alt="Pochita"
          className="h-32 w-auto transform scale-x-[-1]"
        />
      </motion.div>
    </>
  )
}
