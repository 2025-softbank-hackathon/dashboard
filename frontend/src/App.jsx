import { useEffect, useState, useRef } from 'react'
import useDeploymentStore from './store/useDeploymentStore'
import websocket from './services/websocket'
import DeploymentDashboard from './components/DeploymentDashboard'
import TrafficScreen from './components/TrafficScreen'
import SuccessScreen from './components/SuccessScreen'

function App() {
  const { setWsConnected, updateBlueMetrics, updateGreenMetrics, addLog } = useDeploymentStore()
  const [currentScreen, setCurrentScreen] = useState('deployment') // 'deployment', 'traffic', 'success'
  const [xrayServices, setXrayServices] = useState([])
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const videoRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => {
    // Connect to WebSocket server
    websocket.connect('ws://localhost:8080')
      .then(() => {
        setWsConnected(true)
        // Start monitoring
        websocket.startMonitoring()
      })
      .catch((error) => {
        console.error('Failed to connect to WebSocket:', error)
        setWsConnected(false)
      })

    // Listen to metrics
    websocket.on('metrics', (data) => {
      if (data.data.blue) {
        updateBlueMetrics(data.data.blue)
      }
      if (data.data.green) {
        updateGreenMetrics(data.data.green)
      }
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
      websocket.stopMonitoring()
      websocket.disconnect()
    }
  }, [])

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
      {/* Background Video - much higher opacity to be clearly visible */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="fixed top-0 left-0 w-full h-full object-cover z-0"
        style={{ pointerEvents: 'none', opacity: 0.6 }}
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
