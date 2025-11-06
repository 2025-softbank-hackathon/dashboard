import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

// Multiple Pochitas for page 3 - moving left at top and bottom margins
const pochitaPositions = [
  { id: 1, top: '12%', delay: 0 },
  { id: 2, top: '90%', delay: 12 },
  { id: 3, top: '60%', delay: 6 }
]

const pochita2Positions = [
  { id: 4, top: '35%', delay: 3 },
  { id: 5, top: '75%', delay: 9 }
]

function MovingPochita({ top, delay, id, direction = 'left', gifUrl, altText, duration, fade = true }) {
  const [key, setKey] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setKey(prev => prev + 1)
      }, (duration + 8) * 1000)
      return () => clearInterval(interval)
    }, delay * 1000)

    return () => clearTimeout(timeout)
  }, [delay, duration])

  const isRightToLeft = direction === 'left'
  const opacityAnimation = fade ? [0, 1, 1, 0] : 1
  const times = fade ? [0, 0.05, 0.95, 1] : undefined

  return (
    <motion.div
      key={`${id}-${key}`}
      className="fixed z-20 pointer-events-none"
      style={{ top }}
      initial={{ left: isRightToLeft ? 'calc(100% + 200px)' : '-200px', opacity: fade ? 0 : 1 }}
      animate={{
        left: isRightToLeft ? '-200px' : 'calc(100% + 200px)',
        opacity: opacityAnimation
      }}
      transition={{
        duration: duration,
        times: times,
        ease: 'linear',
        delay: key === 0 ? delay : 0
      }}
    >
      <img
        src={gifUrl}
        alt={altText}
        className="h-48 w-auto"
      />
    </motion.div>
  )
}

export default function PochitaPage3() {
  return (
    <>
      {pochitaPositions.map((pos) => (
        <MovingPochita
          key={pos.id}
          id={pos.id}
          top={pos.top}
          delay={pos.delay}
          gifUrl="https://d3ro18w755ioec.cloudfront.net/assets/pochita-unscreen.gif"
          altText="Pochita"
          duration={14}
        />
      ))}
      {pochita2Positions.map((pos) => (
        <MovingPochita
          key={pos.id}
          id={pos.id}
          top={pos.top}
          delay={pos.delay}
          direction="left"
          gifUrl="https://d3ro18w755ioec.cloudfront.net/assets/pochita2.gif"
          altText="Pochita 2"
          duration={10}

        />
      ))}
    </>
  )
}
