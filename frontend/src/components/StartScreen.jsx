import { motion } from 'framer-motion'
import useDeploymentStore from '../store/useDeploymentStore'
import { playSound } from '../utils/sounds'

export default function StartScreen() {
  const { setCurrentScreen } = useDeploymentStore()

  const handleStart = () => {
    playSound('start')
    setTimeout(() => {
      setCurrentScreen('infrastructure')
    }, 500)
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex flex-col items-center justify-center">
      <motion.h1
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="text-7xl font-bold text-white mb-6 text-center"
      >
        🚀 Delightful Deployment
      </motion.h1>

      <motion.p
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-2xl text-white/90 mb-12"
      >
        3D 인프라 빌더 + 실시간 모니터링
      </motion.p>

      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4, type: 'spring', stiffness: 200 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleStart}
        className="px-20 py-6 bg-white text-pink-600 rounded-full text-2xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-300"
      >
        배포 시작!
      </motion.button>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="absolute bottom-10 text-white/70 text-sm"
      >
        🎨 Made with React + Three.js + WebSocket
      </motion.div>
    </div>
  )
}
