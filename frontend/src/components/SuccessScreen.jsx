import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import PochitaPage3 from './PochitaPage3'

const TARGET_STATS = {
  totalRequests: 24,
  avgResponseTime: 312,
  errorRate: 0,
  uptime: 99.98
}

const DEPLOYMENT_TIMELINE = [
  { time: '0:00', event: 'CodeCommit: Patchset merged & tagged (v1.12.4)', status: 'completed' },
  { time: '0:08', event: 'CodeBuild: Cached layers restored, base image hydrated', status: 'completed' },
  { time: '0:24', event: 'Tests: 84 unit + smoke suites green', status: 'completed' },
  { time: '0:38', event: 'Security: Trivy/Snyk scan clean', status: 'completed' },
  { time: '0:52', event: 'ECR: Image pushed sha256:f92e...', status: 'completed' },
  { time: '1:08', event: 'CodeDeploy: Green ECS tasks warmed', status: 'completed' },
  { time: '1:20', event: 'Health: ALB + synthetic checks passed', status: 'completed' },
  { time: '1:30', event: 'Traffic shift: 100% demo audience', status: 'completed' }
]

export default function SuccessScreen() {
  const [stats, setStats] = useState({
    totalRequests: 0,
    avgResponseTime: 0,
    errorRate: 0,
    uptime: 0
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => {
        const next = {
          totalRequests: Math.min(prev.totalRequests + 2, TARGET_STATS.totalRequests),
          avgResponseTime: Math.min(prev.avgResponseTime + 16, TARGET_STATS.avgResponseTime),
          errorRate: TARGET_STATS.errorRate,
          uptime: Math.min(prev.uptime + 4, TARGET_STATS.uptime)
        }

        const reachedTarget =
          next.totalRequests === TARGET_STATS.totalRequests &&
          next.avgResponseTime === TARGET_STATS.avgResponseTime &&
          next.uptime === TARGET_STATS.uptime

        if (reachedTarget) {
          clearInterval(interval)
        }

        return next
      })
    }, 80)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full h-screen relative overflow-y-auto flex items-start justify-center bg-transparent">
      {/* Pochita for page 3 */}
      <PochitaPage3 />

      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-green-400/30 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080)
            }}
            animate={{
              y: [null, -100],
              opacity: [0.3, 0]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-8 w-full py-12">
        {/* Success Header */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="text-9xl mb-6">✓</div>
          <h1 className="text-6xl font-bold text-white mb-4">
            Deployment Successful!
          </h1>
          <p className="text-2xl text-white/80">
            Green environment is serving the demo canary slice
          </p>
        </motion.div>

        {/* Service URL */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border-2 border-green-400"
        >
          <div className="text-white/70 text-sm mb-2">Service URL</div>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-black/30 rounded-lg px-4 py-3 font-mono text-green-400 text-lg">
              https://demo-green.delightful-deployment.com
            </div>
            <button className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-lg transition-colors">
              Copy URL
            </button>
          </div>
        </motion.div>

        {/* Observability Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Deployment Summary</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="text-white/70 text-sm mb-2">Total Requests</div>
              <div className="text-4xl font-bold text-green-400">
                {stats.totalRequests.toLocaleString()}
              </div>
              <div className="text-white/60 text-xs mt-2">Last 15 min canary traffic</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="text-white/70 text-sm mb-2">Avg Response Time</div>
              <div className="text-4xl font-bold text-blue-400">
                {Math.round(stats.avgResponseTime)}ms
              </div>
              <div className="text-green-400 text-xs mt-2 flex items-center gap-1">
                <span>↓</span> p95 480ms (QA load)
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="text-white/70 text-sm mb-2">Error Rate</div>
              <div className="text-4xl font-bold text-yellow-400">
                {stats.errorRate.toFixed(2)}%
              </div>
              <div className="text-white/60 text-xs mt-2">0 incidents this shift</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="text-white/70 text-sm mb-2">Uptime</div>
              <div className="text-4xl font-bold text-green-400">
                {stats.uptime.toFixed(2)}%
              </div>
              <div className="text-white/60 text-xs mt-2">Rolling 30‑day demo cluster</div>
            </div>
          </div>
        </motion.div>

        {/* Observability Tools */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-2xl font-bold text-white mb-4">Observability & Monitoring</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 border-2 border-purple-400 hover:scale-105 transition-transform cursor-pointer">
              <div className="text-3xl mb-3">CW</div>
              <div className="text-white font-bold text-lg mb-2">CloudWatch Dashboard</div>
              <div className="text-white/80 text-sm mb-4">
                Real-time metrics, logs, and alarms
              </div>
              <div className="text-purple-200 text-xs">
                View metrics
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 border-2 border-blue-400 hover:scale-105 transition-transform cursor-pointer">
              <div className="text-3xl mb-3">XR</div>
              <div className="text-white font-bold text-lg mb-2">X-Ray Traces</div>
              <div className="text-white/80 text-sm mb-4">
                Distributed tracing and service maps
              </div>
              <div className="text-blue-200 text-xs">
                View traces
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-6 border-2 border-green-400 hover:scale-105 transition-transform cursor-pointer">
              <div className="text-3xl mb-3">PI</div>
              <div className="text-white font-bold text-lg mb-2">Performance Insights</div>
              <div className="text-white/80 text-sm mb-4">
                Database and application performance
              </div>
              <div className="text-green-200 text-xs">
                View insights
              </div>
            </div>
          </div>
        </motion.div>

        {/* Deployment Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-8"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Deployment Timeline</h2>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="space-y-4">
              {DEPLOYMENT_TIMELINE.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-16 text-green-400 font-mono text-sm">{item.time}</div>
                  <div className="w-4 h-4 rounded-full bg-green-400"></div>
                  <div className="flex-1 text-white">{item.event}</div>
                  <div className="text-green-400 text-sm">✓</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="mt-8 text-center pb-8"
        >
          <div className="text-white/70 text-sm mb-4">What's next?</div>
          <div className="flex gap-4 justify-center">
            <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold px-6 py-3 rounded-lg border border-white/20 transition-colors">
              View Logs
            </button>
            <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold px-6 py-3 rounded-lg border border-white/20 transition-colors">
              Monitor Performance
            </button>
            <button className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-lg transition-colors">
              Deploy Again
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
