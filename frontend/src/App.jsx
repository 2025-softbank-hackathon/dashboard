import { useEffect, useState, useRef } from 'react'
import useDeploymentStore from './store/useDeploymentStore'
import websocket from './services/websocket'
import DeploymentDashboard from './components/DeploymentDashboard'
// import TrafficScreen from './components/TrafficScreen' // [Disabled] Page 2 (Traffic) is commented out per request
import SuccessScreen from './components/SuccessScreen'

const CELEBRATION_DURATION_MS = 6500 // fallback timeout in case the clip end event doesn't fire

function App() {
  const { setWsConnected, updateBlueMetrics, updateGreenMetrics, addLog, setIsRealMode, setMetricsLoading, isRealMode } = useDeploymentStore()
  const [currentScreen, setCurrentScreen] = useState('deployment') // 'deployment', 'traffic', 'success'
  
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [dataMode, setDataMode] = useState('mock') // 'mock' | 'real'
  const videoRef = useRef(null)
  const audioRef = useRef(null)
  const [isCelebrating, setIsCelebrating] = useState(false)
  const celebrationVideoRef = useRef(null)
  const [celebrationNeedsInteraction, setCelebrationNeedsInteraction] = useState(false)
  const backgroundAudioWasPlayingRef = useRef(false)

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

    // Listen to deploy events inferred from log_stream (APIGW)
    websocket.on('deploy_event', (evt) => {
      if (evt && evt.status === 'succeeded') {
        console.log('💚 CodeDeploy succeeded — switching to success screen')
        setCurrentScreen('success')
      }
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

    const celebratoryVideo = celebrationVideoRef.current
    if (!celebratoryVideo) {
      setIsCelebrating(false)
      setCurrentScreen('success')
      return
    }

    const backgroundAudio = audioRef.current
    if (backgroundAudio && !backgroundAudio.paused) {
      backgroundAudioWasPlayingRef.current = true
      backgroundAudio.pause()
      setIsAudioPlaying(false)
    } else {
      backgroundAudioWasPlayingRef.current = false
    }

    setCelebrationNeedsInteraction(false)
    celebratoryVideo.currentTime = 0

    const handleEnded = () => {
      if (backgroundAudioWasPlayingRef.current && backgroundAudio) {
        backgroundAudio.play().catch(() => {})
        setIsAudioPlaying(true)
      }
      backgroundAudioWasPlayingRef.current = false
      setIsCelebrating(false)
      setCurrentScreen('success')
    }

    celebratoryVideo.addEventListener('ended', handleEnded)

    const playVideo = async () => {
      try {
        await celebratoryVideo.play()
        setCelebrationNeedsInteraction(false)
      } catch (error) {
        console.warn('Celebration video failed to autoplay', error)
        setCelebrationNeedsInteraction(true)
      }
    }

    playVideo()

    const timer = setTimeout(() => {
      celebratoryVideo.pause()
      handleEnded()
    }, CELEBRATION_DURATION_MS)

    return () => {
      clearTimeout(timer)
      celebratoryVideo.pause()
      celebratoryVideo.removeEventListener('ended', handleEnded)
    }
  }, [isCelebrating])

  const handleManualCelebrationPlay = async () => {
    const celebratoryVideo = celebrationVideoRef.current
    if (!celebratoryVideo) return
    try {
      await celebratoryVideo.play()
      setCelebrationNeedsInteraction(false)
    } catch (error) {
      console.warn('Manual celebration play failed', error)
    }
  }

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
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={celebrationVideoRef}
                className="w-full h-full object-cover"
                playsInline
                preload="auto"
                muted={false}
                controls={false}
              >
                <source src="https://d3ro18w755ioec.cloudfront.net/assets/clip_12_to_18.mp4" type="video/mp4" />
              </video>
              <p className="absolute bottom-16 text-white text-xl tracking-wide text-center px-4">
                Turning traffic to green in style...
              </p>
              {celebrationNeedsInteraction && (
                <button
                  onClick={handleManualCelebrationPlay}
                  className="absolute bottom-32 bg-white/20 text-white px-6 py-3 rounded-xl border border-white/40 backdrop-blur-md hover:bg-white/30 font-semibold"
                >
                  ▶︎ Play clip
                </button>
              )}
            </div>
          </div>
        )}
        {currentScreen === 'deployment' && (
          <DeploymentDashboard
            onDeploymentComplete={handleDeploymentComplete}
          />
        )}
        {/* [Disabled] Page 2 (Traffic) */}
        {false && currentScreen === 'traffic' && (
          <TrafficScreen onComplete={handleTrafficComplete} />
        )}
        {currentScreen === 'success' && (
          <SuccessScreen />
        )}
      </div>
    </div>
  )
}

export default App
