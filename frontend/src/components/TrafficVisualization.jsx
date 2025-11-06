import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

export default function TrafficVisualization({ blueTraffic, greenTraffic, onTrafficChange, isDeploying }) {
  const [particles, setParticles] = useState([])

  // Generate traffic particles
  useEffect(() => {
    const interval = setInterval(() => {
      const newParticles = [...Array(5)].map((_, i) => ({
        id: Date.now() + i,
        isGreen: Math.random() * 100 < greenTraffic,
        startX: Math.random() * 100
      }))
      setParticles(prev => [...prev.slice(-20), ...newParticles])
    }, 500)

    return () => clearInterval(interval)
  }, [greenTraffic])

  return (
    <div className="w-full space-y-6">
      <h3 className="text-white text-2xl font-bold text-center">
        Blue/Green Traffic Distribution
      </h3>

      {/* ALB Visualization */}
      <div className="relative">
        {/* ALB */}
        <div className="flex justify-center mb-8">
          <motion.div
            className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 shadow-2xl border-4 border-purple-300"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="text-5xl mb-2 text-center font-bold">ALB</div>
            <div className="text-white font-bold text-center text-xl">
              Application Load Balancer
            </div>
            <div className="text-white/70 text-sm text-center mt-2">
              Distributing traffic
            </div>
          </motion.div>
        </div>

        {/* Traffic Flow Particles */}
        <div className="relative h-40 mb-8 overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className={`absolute w-4 h-4 rounded-full ${
                particle.isGreen ? 'bg-green-400' : 'bg-blue-400'
              } shadow-lg`}
              initial={{
                top: 0,
                left: `${particle.startX}%`,
                opacity: 1
              }}
              animate={{
                top: 160,
                opacity: 0
              }}
              transition={{ duration: 2, ease: 'linear' }}
            />
          ))}
        </div>

        {/* Environment Cards */}
        <div className="flex gap-8 justify-center">
          {/* Blue Environment */}
          <motion.div
            className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-2xl border-4 border-blue-300 flex-1 max-w-md"
            animate={{
              scale: blueTraffic > 0 ? 1 : 0.9,
              opacity: blueTraffic > 0 ? 1 : 0.5
            }}
          >
            <div className="text-5xl mb-3 text-center font-bold text-white">BLUE</div>
            <div className="text-white font-bold text-center text-2xl mb-4">
              Blue Environment
            </div>

            <div className="space-y-3">
              <div className="bg-white/20 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-white text-sm">Traffic</span>
                  <span className="text-white font-bold text-3xl">{blueTraffic}%</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2 mt-2">
                  <motion.div
                    className="h-full bg-white rounded-full"
                    animate={{ width: `${blueTraffic}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-white text-sm">
                <span>Active Connections:</span>
                <span className="font-bold">{Math.round(blueTraffic * 10)}</span>
              </div>

              <div className="flex justify-between text-white text-sm">
                <span>Requests/sec:</span>
                <span className="font-bold">{Math.round(blueTraffic * 2.5)}</span>
              </div>
            </div>
          </motion.div>

          {/* Green Environment */}
          <motion.div
            className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 shadow-2xl border-4 border-green-300 flex-1 max-w-md"
            animate={{
              scale: greenTraffic > 0 ? 1 : 0.9,
              opacity: greenTraffic > 0 ? 1 : 0.5
            }}
          >
            <div className="text-5xl mb-3 text-center font-bold text-white">GREEN</div>
            <div className="text-white font-bold text-center text-2xl mb-4">
              Green Environment
            </div>

            <div className="space-y-3">
              <div className="bg-white/20 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-white text-sm">Traffic</span>
                  <span className="text-white font-bold text-3xl">{greenTraffic}%</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2 mt-2">
                  <motion.div
                    className="h-full bg-white rounded-full"
                    animate={{ width: `${greenTraffic}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-white text-sm">
                <span>Active Connections:</span>
                <span className="font-bold">{Math.round(greenTraffic * 10)}</span>
              </div>

              <div className="flex justify-between text-white text-sm">
                <span>Requests/sec:</span>
                <span className="font-bold">{Math.round(greenTraffic * 2.5)}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Traffic Distribution Bar */}
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 text-center">
          <span className="text-white text-lg">
            Blue <span className="text-blue-400 font-bold">{blueTraffic}%</span>
            {' '} → {' '}
            <span className="text-green-400 font-bold">{greenTraffic}%</span> Green
          </span>
        </div>

        {/* Visual Bar */}
        <div className="h-16 bg-white/10 rounded-full flex overflow-hidden border-4 border-white/30 shadow-2xl">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl"
            animate={{ width: `${blueTraffic}%` }}
            transition={{ duration: 0.5 }}
          >
            {blueTraffic > 15 && `${blueTraffic}%`}
          </motion.div>
          <motion.div
            className="bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-xl"
            animate={{ width: `${greenTraffic}%` }}
            transition={{ duration: 0.5 }}
          >
            {greenTraffic > 15 && `${greenTraffic}%`}
          </motion.div>
        </div>

        {/* Traffic Control Slider (only when not deploying) */}
        {!isDeploying && (
          <div className="mt-6">
            <input
              type="range"
              min="0"
              max="100"
              value={greenTraffic}
              onChange={(e) => onTrafficChange(Number(e.target.value))}
              className="w-full h-4 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${blueTraffic}%, #4ADE80 ${blueTraffic}%, #4ADE80 100%)`
              }}
            />
            <div className="text-center text-white/70 text-sm mt-2">
              Drag to manually adjust traffic distribution
            </div>
          </div>
        )}
      </div>

      {/* Traffic Shift Recommendation */}
      {greenTraffic > 20 && greenTraffic < 100 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md mx-auto bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 shadow-2xl border-4 border-purple-300"
        >
          <div className="text-4xl mb-3 text-center font-bold text-yellow-300">!</div>
          <div className="text-white text-center">
            <div className="text-lg font-bold mb-2">Performance Analysis</div>
            <div className="text-sm">
              Green environment shows <span className="font-bold text-yellow-300">23% faster</span> response times!
              <br />
              Consider shifting to 100% for optimal performance.
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
