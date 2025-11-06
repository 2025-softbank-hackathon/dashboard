import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import useDeploymentStore from '../store/useDeploymentStore'
import XRayServiceMap from './XRayServiceMap'

export default function TrafficScreen({ onComplete, xrayServices }) {
  const { updateBlueMetrics, updateGreenMetrics, addLog } = useDeploymentStore()
  const [greenTraffic, setGreenTraffic] = useState(0)
  const [particles, setParticles] = useState([])

  // Auto shift traffic to 100% Green
  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setGreenTraffic(prev => {
          const next = prev + 5
          if (next >= 100) {
            clearInterval(interval)

            addLog({
              timestamp: new Date().toISOString(),
              type: 'success',
              message: '[SUCCESS] Traffic shift completed! 100% on Green environment.'
            })

            setTimeout(() => {
              if (onComplete) onComplete()
            }, 2000)

            return 100
          }
          return next
        })
      }, 300)

      return () => clearInterval(interval)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Update metrics based on traffic
  useEffect(() => {
    updateBlueMetrics({ traffic: 100 - greenTraffic })
    updateGreenMetrics({ traffic: greenTraffic })
  }, [greenTraffic])

  // Generate particles continuously
  useEffect(() => {
    const interval = setInterval(() => {
      const particleCount = 12
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: Date.now() + Math.random(),
        delay: i * 0.05,
        targetGreen: Math.random() * 100 < greenTraffic,
        xOffset: (Math.random() - 0.5) * 60 // Random horizontal offset
      }))

      setParticles(prev => [...prev.slice(-150), ...newParticles])
    }, 200)

    return () => clearInterval(interval)
  }, [greenTraffic])

  return (
    <div className="w-full h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
        <h2 className="text-3xl font-bold text-white text-center">
          Blue/Green Traffic Shift
        </h2>
      </div>

      {/* Main Layout: Left (X-Ray) + Right (Traffic Animation) */}
      <div className="flex h-full pt-16">
        {/* Left: X-Ray Service Map */}
        <div className="w-1/2 p-4">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 h-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white text-xl font-bold">
                X-Ray Service Map - Real-time
                {xrayServices && xrayServices.length > 0 && (
                  <span className="text-sm text-green-400 ml-2">(Live)</span>
                )}
              </h3>

              {/* Service Type Legend */}
              <div className="flex gap-2 text-xs">
                <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded">
                  <div className="w-3 h-3 rounded-sm bg-pink-500"></div>
                  <span className="text-white/70">ALB</span>
                </div>
                <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-white/70">Blue</span>
                </div>
                <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-white/70">Green</span>
                </div>
                <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded">
                  <div className="w-3 h-3 rounded-sm bg-orange-500"></div>
                  <span className="text-white/70">DB</span>
                </div>
                <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded">
                  <div className="w-3 h-3 bg-red-500" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></div>
                  <span className="text-white/70">Cache</span>
                </div>
              </div>
            </div>
            <div className="h-[calc(100%-3rem)] rounded-xl overflow-hidden bg-black/30">
              <XRayServiceMap showGreen={true} services={xrayServices} />
            </div>
          </div>
        </div>

        {/* Right: Traffic Animation */}
        <div className="w-1/2 relative flex flex-col items-center justify-center p-4">
          {/* ALB - Traffic Source */}
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10">
            <motion.div
              className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-4 shadow-2xl border-2 border-purple-300"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="text-2xl font-bold text-white text-center">ALB</div>
              <div className="text-white/80 text-xs text-center">Load Balancer</div>
            </motion.div>
          </div>

          {/* Particle Flow */}
          <div className="absolute top-32 left-1/2 transform -translate-x-1/2 w-full h-64 pointer-events-none">
            {particles.map((particle) => {
              // 목표 X 위치 계산 (오른쪽 절반 영역 내에서)
              const targetX = particle.targetGreen ? 150 : -150

              return (
                <motion.div
                  key={particle.id}
                  className={`absolute w-3 h-3 rounded-full ${
                    particle.targetGreen ? 'bg-green-400 shadow-green-400/50' : 'bg-blue-400 shadow-blue-400/50'
                  } shadow-lg`}
                  initial={{
                    top: 0,
                    left: `calc(50% + ${particle.xOffset}px)`,
                    opacity: 1,
                    scale: 1
                  }}
                  animate={{
                    top: [0, 120, 250],
                    left: [
                      `calc(50% + ${particle.xOffset}px)`,
                      `calc(50% + ${particle.xOffset * 0.5}px)`,
                      `calc(50% + ${targetX}px)`
                    ],
                    opacity: [1, 1, 0],
                    scale: [1, 1.1, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    delay: particle.delay,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    times: [0, 0.4, 1]
                  }}
                />
              )
            })}
          </div>

          {/* Environment Containers */}
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-8 z-10">
            {/* Blue Environment */}
            <motion.div
              className="relative"
              animate={{
                scale: 100 - greenTraffic > 0 ? 1 : 0.8,
                opacity: 100 - greenTraffic > 0 ? 1 : 0.4
              }}
            >
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-2xl border-3 border-blue-300 w-64 h-80 relative overflow-hidden">
                {/* Traffic fill animation */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 bg-blue-400/30"
                  animate={{
                    height: `${100 - greenTraffic}%`
                  }}
                  transition={{ duration: 0.5 }}
                />

                <div className="relative z-10">
                  <div className="text-4xl font-bold text-white mb-2 text-center">BLUE</div>
                  <div className="text-white text-sm text-center mb-4">Current</div>

                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 mb-3">
                    <div className="text-white/70 text-xs mb-1">Traffic</div>
                    <div className="text-white text-4xl font-bold">{100 - greenTraffic}%</div>
                  </div>

                  <div className="space-y-1 text-white/80 text-xs">
                    <div className="flex justify-between">
                      <span>Connections:</span>
                      <span className="font-bold">{Math.round((100 - greenTraffic) * 10)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Req/sec:</span>
                      <span className="font-bold">{Math.round((100 - greenTraffic) * 2.5)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Green Environment */}
            <motion.div
              className="relative"
              animate={{
                scale: greenTraffic > 0 ? 1 : 0.8,
                opacity: greenTraffic > 0 ? 1 : 0.4
              }}
            >
              <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 shadow-2xl border-3 border-green-300 w-64 h-80 relative overflow-hidden">
                {/* Traffic fill animation */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 bg-green-400/30"
                  animate={{
                    height: `${greenTraffic}%`
                  }}
                  transition={{ duration: 0.5 }}
                />

                <div className="relative z-10">
                  <div className="text-4xl font-bold text-white mb-2 text-center">GREEN</div>
                  <div className="text-white text-sm text-center mb-4">New</div>

                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 mb-3">
                    <div className="text-white/70 text-xs mb-1">Traffic</div>
                    <div className="text-white text-4xl font-bold">{greenTraffic}%</div>
                  </div>

                  <div className="space-y-1 text-white/80 text-xs">
                    <div className="flex justify-between">
                      <span>Connections:</span>
                      <span className="font-bold">{Math.round(greenTraffic * 10)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Req/sec:</span>
                      <span className="font-bold">{Math.round(greenTraffic * 2.5)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Progress Info */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-black/50 backdrop-blur-md rounded-lg px-4 py-2 border border-white/20">
              <div className="text-white text-center">
                <div className="text-xs text-white/70 mb-1">Shift Progress</div>
                <div className="text-xl font-bold">
                  <span className="text-blue-400">{100 - greenTraffic}%</span>
                  {' → '}
                  <span className="text-green-400">{greenTraffic}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Indicator */}
          {greenTraffic > 30 && greenTraffic < 100 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-1/3 right-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 shadow-2xl border-2 border-purple-300 max-w-xs"
            >
              <div className="text-2xl mb-2 text-center font-bold text-yellow-300">!</div>
              <div className="text-white text-center">
                <div className="text-sm font-bold mb-1">Performance</div>
                <div className="text-xs">
                  Green <span className="font-bold text-yellow-300">23% faster</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
