import { useEffect, useState } from 'react'
import useDeploymentStore from './store/useDeploymentStore'
import websocket from './services/websocket'
import DeploymentDashboard from './components/DeploymentDashboard'
import TrafficScreen from './components/TrafficScreen'
import SuccessScreen from './components/SuccessScreen'

function App() {
  const { setWsConnected, updateBlueMetrics, updateGreenMetrics, addLog } = useDeploymentStore()
  const [currentScreen, setCurrentScreen] = useState('deployment') // 'deployment', 'traffic', 'success'
  const [xrayServices, setXrayServices] = useState([])

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

  return (
    <div className="w-screen h-screen overflow-hidden">
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
  )
}

export default App
