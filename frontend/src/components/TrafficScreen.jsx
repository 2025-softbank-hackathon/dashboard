import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import useDeploymentStore from '../store/useDeploymentStore'
import XRayServiceMap2D from './XRayServiceMap2D'
import PochitaPage2 from './PochitaPage2'

export default function TrafficScreen({ onComplete, xrayServices }) {
  const { updateBlueMetrics, updateGreenMetrics, addLog } = useDeploymentStore()
  const [greenTraffic, setGreenTraffic] = useState(0)

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

  return (
    <div className="w-full h-screen relative overflow-hidden bg-transparent">
      {/* Pochita for page 2 */}
      <PochitaPage2 />

      {/* Header */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
        <h2 className="text-3xl font-bold text-white text-center">
          Blue/Green Traffic Shift
        </h2>
      </div>

      {/* Main Content: Full Width 2D Architecture Diagram */}
      <div className="flex flex-col h-full pt-20 px-8 pb-8">
        {/* Traffic Progress Bar */}
        <div className="mb-6">
          <div className="bg-black/40  rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="text-white">
                <div className="text-sm text-white/70 mb-1">Traffic Distribution</div>
                <div className="text-2xl font-bold">
                  <span className="text-blue-400">{100 - greenTraffic}%</span>
                  {' → '}
                  <span className="text-green-400">{greenTraffic}%</span>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-blue-600/30  px-4 py-2 rounded-lg border border-blue-400/30">
                  <div className="text-blue-300 text-xs mb-1">Blue Environment</div>
                  <div className="text-white text-xl font-bold">{100 - greenTraffic}%</div>
                </div>
                <div className="bg-green-600/30  px-4 py-2 rounded-lg border border-green-400/30">
                  <div className="text-green-300 text-xs mb-1">Green Environment</div>
                  <div className="text-white text-xl font-bold">{greenTraffic}%</div>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-6 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600"
                animate={{ width: `${100 - greenTraffic}%` }}
                transition={{ duration: 0.5 }}
              />
              <motion.div
                className="absolute right-0 top-0 h-full bg-gradient-to-r from-green-500 to-green-600"
                animate={{ width: `${greenTraffic}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* 2D X-Ray Architecture Diagram - Full Width */}
        <div className="flex-1 bg-black/40  rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-2xl font-bold">
              AWS Architecture - Real-time Service Map
              {xrayServices && xrayServices.length > 0 && (
                <span className="text-sm text-green-400 ml-2">(Live)</span>
              )}
            </h3>

            {/* Service Type Legend */}
            <div className="flex gap-2 text-xs">
              <div className="flex items-center gap-1 bg-black/30 px-3 py-1.5 rounded-lg">
                <div className="w-3 h-3 rounded bg-purple-500"></div>
                <span className="text-white/70">User</span>
              </div>
              <div className="flex items-center gap-1 bg-black/30 px-3 py-1.5 rounded-lg">
                <div className="w-3 h-3 rounded bg-pink-500"></div>
                <span className="text-white/70">ALB</span>
              </div>
              <div className="flex items-center gap-1 bg-black/30 px-3 py-1.5 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-white/70">Blue</span>
              </div>
              <div className="flex items-center gap-1 bg-black/30 px-3 py-1.5 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-white/70">Green</span>
              </div>
              <div className="flex items-center gap-1 bg-black/30 px-3 py-1.5 rounded-lg">
                <div className="w-3 h-3 rounded bg-orange-500"></div>
                <span className="text-white/70">DynamoDB</span>
              </div>
              <div className="flex items-center gap-1 bg-black/30 px-3 py-1.5 rounded-lg">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span className="text-white/70">Redis</span>
              </div>
              <div className="flex items-center gap-1 bg-black/30 px-3 py-1.5 rounded-lg">
                <div className="w-3 h-3 rounded bg-gray-500"></div>
                <span className="text-white/70">NAT GW</span>
              </div>
            </div>
          </div>

          <div className="h-[calc(100%-4rem)] rounded-xl overflow-hidden">
            <XRayServiceMap2D services={xrayServices} />
          </div>
        </div>

        {/* Performance Indicator */}
        {greenTraffic > 30 && greenTraffic < 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-8 right-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 shadow-2xl border-2 border-purple-300 max-w-xs z-30"
          >
            <div className="text-2xl mb-2 text-center font-bold text-yellow-300">✨</div>
            <div className="text-white text-center">
              <div className="text-sm font-bold mb-1">Performance Improvement</div>
              <div className="text-xs">
                Green environment is <span className="font-bold text-yellow-300">23% faster</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
