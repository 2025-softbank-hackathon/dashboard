import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

// Multiple Pochitas for page 2 - moving left without interfering
const pochitaPositions = [
  { id: 1, top: '8%', delay: 0 },
  { id: 2, top: '88%', delay: 10 }
]

function MovingPochita({ top, delay, id }) {
  const [key, setKey] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setKey(prev => prev + 1)
      }, 20000)
      return () => clearInterval(interval)
    }, delay * 1000)

    return () => clearTimeout(timeout)
  }, [delay])

  return (
    <motion.div
      key={`${id}-${key}`}
      className="fixed z-20 pointer-events-none"
      style={{ top }}
      initial={{ right: '-200px', opacity: 0 }}
      animate={{
        right: 'calc(100% + 200px)',
        opacity: [0, 1, 1, 0]
      }}
      transition={{
        duration: 13,
        times: [0, 0.05, 0.95, 1],
        ease: 'linear',
        delay: key === 0 ? delay : 0
      }}
    >
      <img
        src="https://d3ro18w755ioec.cloudfront.net/assets/pochita-unscreen.gif"
        alt="Pochita"
        className="h-48 w-auto"
      />
    </motion.div>
  )
}

export default function PochitaPage2() {
  return (
    <>
      {pochitaPositions.map((pos) => (
        <MovingPochita
          key={pos.id}
          id={pos.id}
          top={pos.top}
          delay={pos.delay}
        />
      ))}
    </>
  )
}
