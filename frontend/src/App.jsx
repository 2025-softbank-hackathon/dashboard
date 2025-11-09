import { useEffect, useState, useRef } from 'react'
import useDeploymentStore from './store/useDeploymentStore'
import websocket from './services/websocket'
import DeploymentDashboard from './components/DeploymentDashboard'
// import TrafficScreen from './components/TrafficScreen' // [Disabled] Page 2 (Traffic) is commented out per request
import SuccessScreen from './components/SuccessScreen'

function App() {
  const { setWsConnected, updateBlueMetrics, updateGreenMetrics, addLog, setIsRealMode, setMetricsLoading, isRealMode } = useDeploymentStore()
  const [currentScreen, setCurrentScreen] = useState('deployment') // 'deployment', 'traffic', 'success'
  const [xrayServices, setXrayServices] = useState([])
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [dataMode, setDataMode] = useState('mock') // 'mock' | 'real'
  const videoRef = useRef(null)
  const audioRef = useRef(null)
  const [isCelebrating, setIsCelebrating] = useState(false)
  const celebrationAudioRef = useRef(null)

  useEffect(() => {
    // Default to mock stream: start polling without WS connection
    setWsConnected(false)
    websocket.startPolling(5000)

    // Listen to metrics
    websocket.on('metrics', (data) => {
      if (data.data.blue) {
        updateBlueMetrics(data.data.blue)
      }
      if (data.data.green) {
        updateGreenMetrics(data.data.green)
      }

      // When in Real mode, hide loader only after valid AWS numbers arrive
      try {
        const currentReal = typeof useDeploymentStore?.getState === 'function' ? useDeploymentStore.getState().isRealMode : isRealMode
        if (currentReal) {
          const b = data.data.blue || {}
          const g = data.data.green || {}
          const isNum = (v) => typeof v === 'number' && !Number.isNaN(v)
          const blueOk = isNum(b.cpu) || isNum(b.memory) || isNum(b.responseTime)
          const greenOk = isNum(g.cpu) || isNum(g.memory) || isNum(g.responseTime)
          if (blueOk || greenOk) {
            setMetricsLoading(false)
          }
        }
      } catch {}
    })

    // Listen to logs
    websocket.on('log', (data) => {
      addLog(data.data)
    })

    // Listen to pipeline status
    websocket.on('pipeline_status', (data) => {
      console.log('Pipeline status:', data.data)
    })

    // Listen to CodeBuild status
    websocket.on('codebuild_status', (data) => {
      console.log('CodeBuild status:', data.data)
    })

    // Listen to CodeDeploy status
    websocket.on('codedeploy_status', (data) => {
      console.log('CodeDeploy status:', data.data)
    })

    // Listen to X-Ray service map updates
    websocket.on('xray_service_map', (data) => {
      console.log('X-Ray service map:', data.data)
      setXrayServices(data.data)
    })

    // Cleanup
    return () => {
      websocket.stopPolling()
      websocket.disconnect()
    }
  }, [])

  const handleDeploymentComplete = () => {
    // Trigger celebratory media before showing the success screen
    setIsCelebrating(true)
  }

  const handleTrafficComplete = () => {
    setCurrentScreen('success')
  }

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsAudioPlaying(!isAudioPlaying)
    }
  }

  useEffect(() => {
    if (!isCelebrating) return

    const celebratoryAudio = celebrationAudioRef.current
    const playAudio = async () => {
      try {
        await celebratoryAudio?.play()
      } catch (error) {
        console.warn('Celebration audio failed to play', error)
      }
    }

    playAudio()

    const timer = setTimeout(() => {
      if (celebratoryAudio) {
        celebratoryAudio.pause()
        celebratoryAudio.currentTime = 0
      }
      setIsCelebrating(false)
      setCurrentScreen('success')
    }, 1500)

    return () => clearTimeout(timer)
  }, [isCelebrating])

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      {/* Background Video - subtle opacity to not overwhelm content */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="fixed top-0 left-0 w-full h-full object-cover z-0"
        style={{ pointerEvents: 'none', opacity: 1 }}
      >
        <source src="https://d3ro18w755ioec.cloudfront.net/assets/background-video.mp4" type="video/mp4" />
      </video>

      {/* Background Audio */}
      <audio ref={audioRef} loop>
        <source src="https://d3ro18w755ioec.cloudfront.net/assets/background-video.mp4" type="audio/mpeg" />
      </audio>

      {/* Celebration Audio */}
      <audio ref={celebrationAudioRef}>
        <source src="https://chatapp-dev-static-f841f30e.s3.ap-northeast-2.amazonaws.com/assets/bomb-sound.mp4" type="audio/mp4" />
      </audio>

      {/* Audio Control Button */}
      <button
        onClick={toggleAudio}
        className="fixed top-4 right-4 z-50 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white rounded-full p-3 border border-white/20 transition-all duration-300 shadow-lg"
        aria-label="Toggle background music"
      >
        {isAudioPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.586A2 2 0 014 13.586V10.414a2 2 0 011.586-1.957l4.828-1.207a2 2 0 012.414 1.957v8.586a2 2 0 01-2.414 1.957l-4.828-1.207z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15.586A2 2 0 014 13.586V10.414a2 2 0 011.586-1.957l4.828-1.207a2 2 0 012.414 1.957v8.586a2 2 0 01-2.414 1.957l-4.828-1.207zM13 12h8" />
          </svg>
        )}
      </button>

      {/* Data Mode Toggle (Mock / Real) */}
      {/* Moved to bottom-left to avoid overlapping with background title */}
      <div className="fixed bottom-6 left-6 z-50 flex gap-2">
        <button
          onClick={() => {
            // Switch to Mock mode: stop WS and use local mock fallback
            try { websocket.disconnect() } catch {}
            websocket.stopPolling()
            websocket.startPolling(5000)
            websocket.useMockData()
            setDataMode('mock')
            setIsRealMode(false)
            setMetricsLoading(false)
          }}
          className={`px-3 py-2 rounded-lg border transition-all duration-200 ${
            dataMode === 'mock' ? 'bg-white/20 text-white border-white/30' : 'bg-black/30 text-white/80 border-white/10'
          }`}
          title="Switch to Mock data"
        >
          Mock
        </button>
        <button
          onClick={() => {
            // Switch to Real mode: connect WS and start polling
            websocket.disconnect()
            websocket.connect()
              .then(() => setWsConnected(true))
              .catch(() => setWsConnected(false))
            websocket.useRealData()
            setDataMode('real')
            setIsRealMode(true)
            setMetricsLoading(true)
            // immediately request one fetch to reflect real data fast
            websocket.startPolling(5000)
          }}
          className={`px-3 py-2 rounded-lg border transition-all duration-200 ${
            dataMode === 'real' ? 'bg-white/20 text-white border-white/30' : 'bg-black/30 text-white/80 border-white/10'
          }`}
          title="Switch to Real AWS data"
        >
          Real
        </button>
      </div>

      {/* Content Layer */}
      <div className="relative z-10 w-full h-full">
        {isCelebrating && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="flex flex-col items-center">
              <img
                src="https://chatapp-dev-static-f841f30e.s3.ap-northeast-2.amazonaws.com/assets/rezebomb.gif"
                alt="Celebration animation"
                className="w-72 h-72 object-contain mb-6 drop-shadow-[0_0_25px_rgba(255,255,255,0.45)]"
              />
              <p className="text-white text-lg tracking-wide">
                Turning traffic to green in style...
              </p>
            </div>
          </div>
        )}
        {currentScreen === 'deployment' && (
          <DeploymentDashboard
            onDeploymentComplete={handleDeploymentComplete}
            xrayServices={xrayServices}
          />
        )}
        {/* [Disabled] Page 2 (Traffic) */}
        {false && currentScreen === 'traffic' && (
          <TrafficScreen onComplete={handleTrafficComplete} xrayServices={xrayServices} />
        )}
        {currentScreen === 'success' && (
          <SuccessScreen />
        )}
      </div>
    </div>
  )
}

export default App
