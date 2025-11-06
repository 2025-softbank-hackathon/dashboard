import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LogStream({ logs }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  const getLogColor = (type) => {
    switch (type) {
      case 'success':
        return 'text-success-400 border-success-400'
      case 'error':
        return 'text-red-400 border-red-400'
      case 'warning':
        return 'text-yellow-400 border-yellow-400'
      default:
        return 'text-blue-400 border-blue-400'
    }
  }

  const getLogIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      default:
        return 'ℹ️'
    }
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
    >
      <AnimatePresence>
        {logs.map((log, index) => (
          <motion.div
            key={index}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`p-3 bg-white/5 rounded-lg border-l-4 ${getLogColor(log.type)}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{getLogIcon(log.type)}</span>
              <div className="flex-1">
                <div className="text-xs text-white/50 mb-1">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
                <div className={`text-sm ${getLogColor(log.type).split(' ')[0]}`}>
                  {log.message}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
