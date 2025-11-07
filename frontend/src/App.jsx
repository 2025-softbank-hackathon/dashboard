import { useEffect, useState, useRef, useCallback } from 'react'
import useDeploymentStore from './store/useDeploymentStore'
import websocket from './services/websocket'
import DeploymentDashboard from './components/DeploymentDashboard'
import TrafficScreen from './components/TrafficScreen'
import SuccessScreen from './components/SuccessScreen'
import { transformCloudWatchMetrics, transformXRayGraph } from './utils/dataTransforms'

function App() {
  const {
    setWsConnected,
    updateBlueMetrics,
    updateGreenMetrics,
    addLog,
  } = useDeploymentStore()
  const [currentScreen, setCurrentScreen] = useState('deployment') // 'deployment', 'traffic', 'success'
  const [xrayServices, setXrayServices] = useState([])
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const videoRef = useRef(null)
  const audioRef = useRef(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const handleCloudWatchMetrics = useCallback((rawMetrics) => {
    const transformed = transformCloudWatchMetrics(rawMetrics)
    if (transformed.blue) {
      updateBlueMetrics(transformed.blue)

      if (Number.isFinite(transformed.blue.albErrors) && transformed.blue.albErrors > 0) {
        addLog({
          timestamp: new Date().toISOString(),
          type: 'warning',
          message: `[ALB][Blue] Detected ${transformed.blue.albErrors} HTTP 5xx responses in the latest window.`,
        })
      }
    }

    if (transformed.green) {
      updateGreenMetrics(transformed.green)

      if (Number.isFinite(transformed.green.albErrors) && transformed.green.albErrors > 0) {
        addLog({
          timestamp: new Date().toISOString(),
          type: 'warning',
          message: `[ALB][Green] Detected ${transformed.green.albErrors} HTTP 5xx responses in the latest window.`,
        })
      }
    }
    setLastUpdated(new Date().toISOString())
  }, [addLog, updateBlueMetrics, updateGreenMetrics, setLastUpdated])

  const handleXRayGraph = useCallback((graph) => {
    const normalized = transformXRayGraph(graph)
    setXrayServices(normalized)
  }, [])

  useEffect(() => {
    // Connect to WebSocket server
    const targetUrl = import.meta.env.VITE_WEBSOCKET_URL || undefined

    websocket.connect(targetUrl)
      .then(() => {
        setWsConnected(true)
      })
      .catch((error) => {
        console.error('Failed to connect to WebSocket:', error)
        setWsConnected(false)
      })

    const metricsListener = handleCloudWatchMetrics
    const xrayListener = handleXRayGraph
    const timestampListener = (timestamp) => {
      setLastUpdated(timestamp)
    }

    const connectedListener = () => {
      addLog({
        timestamp: new Date().toISOString(),
        type: 'success',
        message: '[WS] Connected to real-time monitoring stream.',
      })
    }

    const disconnectedListener = () => {
      addLog({
        timestamp: new Date().toISOString(),
        type: 'warning',
        message: '[WS] Connection lost. Attempting to reconnect...',
      })
    }

    const errorListener = (error) => {
      addLog({
        timestamp: new Date().toISOString(),
        type: 'error',
        message: `[WS] WebSocket error: ${error?.message || 'Unknown error'}`,
      })
    }

    websocket.on('cloudwatch_metrics', metricsListener)
    websocket.on('xray_service_graph', xrayListener)
    websocket.on('timestamp', timestampListener)
    websocket.on('connected', connectedListener)
    websocket.on('disconnected', disconnectedListener)
    websocket.on('error', errorListener)

    // Cleanup
    return () => {
      websocket.off('cloudwatch_metrics', metricsListener)
      websocket.off('xray_service_graph', xrayListener)
      websocket.off('timestamp', timestampListener)
      websocket.off('connected', connectedListener)
      websocket.off('disconnected', disconnectedListener)
      websocket.off('error', errorListener)
      websocket.disconnect()
    }
  }, [addLog, handleCloudWatchMetrics, handleXRayGraph, setWsConnected])

  const handleDeploymentComplete = () => {
    setCurrentScreen('traffic')
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

      {/* Content Layer */}
      <div className="relative z-10 w-full h-full">
        {currentScreen === 'deployment' && (
          <DeploymentDashboard
            onDeploymentComplete={handleDeploymentComplete}
            xrayServices={xrayServices}
            lastUpdated={lastUpdated}
          />
        )}
        {currentScreen === 'traffic' && (
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
