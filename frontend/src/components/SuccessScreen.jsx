import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function SuccessScreen() {
  const [stats, setStats] = useState({
    totalRequests: 0,
    avgResponseTime: 0,
    errorRate: 0,
    uptime: 0
  })

  useEffect(() => {
    // Animate stats counting up
    const interval = setInterval(() => {
      setStats(prev => ({
        totalRequests: Math.min(prev.totalRequests + 150, 15234),
        avgResponseTime: Math.min(prev.avgResponseTime + 3, 188),
        errorRate: Math.min(prev.errorRate + 0.001, 0.023),
        uptime: Math.min(prev.uptime + 0.5, 99.99)
      }))
    }, 50)

    setTimeout(() => clearInterval(interval), 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 relative overflow-hidden flex items-center justify-center">
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

      <div className="relative z-10 max-w-6xl mx-auto px-8 w-full">
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
            Your application is now live on the Green environment
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
              <div className="text-white/60 text-xs mt-2">Last 5 minutes</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="text-white/70 text-sm mb-2">Avg Response Time</div>
              <div className="text-4xl font-bold text-blue-400">
                {Math.round(stats.avgResponseTime)}ms
              </div>
              <div className="text-green-400 text-xs mt-2 flex items-center gap-1">
                <span>↓</span> 23% faster
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="text-white/70 text-sm mb-2">Error Rate</div>
              <div className="text-4xl font-bold text-yellow-400">
                {stats.errorRate.toFixed(3)}%
              </div>
              <div className="text-white/60 text-xs mt-2">Within SLA</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="text-white/70 text-sm mb-2">Uptime</div>
              <div className="text-4xl font-bold text-green-400">
                {stats.uptime.toFixed(2)}%
              </div>
              <div className="text-white/60 text-xs mt-2">30 days</div>
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
              {[
                { time: '0:00', event: 'CodeCommit: Source retrieved', status: 'completed' },
                { time: '0:02', event: 'CodeBuild: Docker image built', status: 'completed' },
                { time: '0:08', event: 'Tests: All 47 tests passed', status: 'completed' },
                { time: '0:12', event: 'ECR: Image pushed successfully', status: 'completed' },
                { time: '0:16', event: 'CodeDeploy: Green environment created', status: 'completed' },
                { time: '0:21', event: 'Health Check: All checks passed', status: 'completed' },
                { time: '0:24', event: 'Traffic Shift: 100% to Green', status: 'completed' }
              ].map((item, index) => (
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
