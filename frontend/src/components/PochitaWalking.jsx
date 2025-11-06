import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

// Multiple Pochitas walking at different positions and speeds
const pochitas = [
  { id: 1, bottom: '8%', duration: 12, delay: 0, size: 'h-24' },
  { id: 2, bottom: '25%', duration: 15, delay: 3, size: 'h-20' },
  { id: 3, bottom: '45%', duration: 18, delay: 6, size: 'h-28' },
  { id: 4, bottom: '65%', duration: 14, delay: 9, size: 'h-22' },
  { id: 5, bottom: '15%', duration: 16, delay: 12, size: 'h-26' }
]

function SinglePochita({ bottom, duration, delay, size, id }) {
  const [key, setKey] = useState(0)

  useEffect(() => {
    // Restart animation with initial delay
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setKey(prev => prev + 1)
      }, (duration + 3) * 1000) // Duration + pause
      return () => clearInterval(interval)
    }, delay * 1000)

    return () => clearTimeout(timeout)
  }, [duration, delay])

  return (
    <motion.div
      key={`${id}-${key}`}
      className="fixed z-20 pointer-events-none"
      style={{ bottom, opacity: 0.3 }}
      initial={{ left: 'calc(100% + 150px)' }}
      animate={{
        left: '-150px'
      }}
      transition={{
        duration,
        ease: 'linear',
        delay: key === 0 ? delay : 0
      }}
    >
      <img
        src="https://d3ro18w755ioec.cloudfront.net/assets/pochita-unscreen.gif"
        alt="Pochita walking"
        className={`${size} w-auto`}
        style={{ transform: 'scaleX(-1)' }}
      />
    </motion.div>
  )
}

export default function PochitaWalking() {
  return (
    <>
      {pochitas.map((pochita) => (
        <SinglePochita
          key={pochita.id}
          id={pochita.id}
          bottom={pochita.bottom}
          duration={pochita.duration}
          delay={pochita.delay}
          size={pochita.size}
        />
      ))}
    </>
  )
}
