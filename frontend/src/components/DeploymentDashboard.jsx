import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useDeploymentStore from '../store/useDeploymentStore'
import PipelineStages from './PipelineStages'
import CloudWatchMetrics from './CloudWatchMetrics'
import LogStream from './LogStream'
import PochitaStatic from './PochitaStatic'

export default function DeploymentDashboard({ onDeploymentComplete, xrayServices, lastUpdated }) {
  const {
    blueMetrics,
    greenMetrics,
    logs,
    addLog,
    updateBlueMetrics,
    updateGreenMetrics
  } = useDeploymentStore()

  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentStarted, setDeploymentStarted] = useState(false)
  const [currentPipelineStage, setCurrentPipelineStage] = useState('')
  const [stageStatuses, setStageStatuses] = useState({})
  const [stageLogs, setStageLogs] = useState({})
  const [elapsedTime, setElapsedTime] = useState(0)

  // Metrics history for charts
  const [blueHistory, setBlueHistory] = useState({
    cpu: Array(30).fill(0),
    memory: Array(30).fill(0),
    responseTime: Array(30).fill(0)
  })
  const [greenHistory, setGreenHistory] = useState({
    cpu: Array(30).fill(0),
    memory: Array(30).fill(0),
    responseTime: Array(30).fill(0)
  })

  // Update metrics history
  useEffect(() => {
    const interval = setInterval(() => {
      setBlueHistory(prev => {
        const fallbackCpu = Number.isFinite(blueMetrics.cpu) ? blueMetrics.cpu : prev.cpu[prev.cpu.length - 1] || 0
        const fallbackMemory = Number.isFinite(blueMetrics.memory) ? blueMetrics.memory : prev.memory[prev.memory.length - 1] || 0
        const fallbackResponse = Number.isFinite(blueMetrics.responseTime) ? blueMetrics.responseTime : prev.responseTime[prev.responseTime.length - 1] || 0

        return {
          cpu: [...prev.cpu.slice(1), fallbackCpu],
          memory: [...prev.memory.slice(1), fallbackMemory],
          responseTime: [...prev.responseTime.slice(1), fallbackResponse]
        }
      })

      if (deploymentStarted) {
        setGreenHistory(prev => {
          const fallbackCpu = Number.isFinite(greenMetrics.cpu) ? greenMetrics.cpu : prev.cpu[prev.cpu.length - 1] || 0
          const fallbackMemory = Number.isFinite(greenMetrics.memory) ? greenMetrics.memory : prev.memory[prev.memory.length - 1] || 0
          const fallbackResponse = Number.isFinite(greenMetrics.responseTime) ? greenMetrics.responseTime : prev.responseTime[prev.responseTime.length - 1] || 0

          return {
            cpu: [...prev.cpu.slice(1), fallbackCpu],
            memory: [...prev.memory.slice(1), fallbackMemory],
            responseTime: [...prev.responseTime.slice(1), fallbackResponse]
          }
        })
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [blueMetrics, greenMetrics, deploymentStarted])

  // Elapsed time counter
  useEffect(() => {
    if (isDeploying) {
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isDeploying])

  // Start deployment simulation
  const startDeployment = async () => {
    setIsDeploying(true)
    setDeploymentStarted(true)
    setElapsedTime(0)

    // Pipeline stages with detailed simulation
    const stages = [
      {
        id: 'commit',
        name: 'CodeCommit',
        duration: 2000,
        logs: [
          '[INFO] Fetching latest commit from repository...',
          '[SUCCESS] Retrieved commit sha: abc123def456',
          '[SUCCESS] Source code ready for build'
        ]
      },
      {
        id: 'build',
        name: 'CodeBuild',
        duration: 8000,
        logs: [
          '[INFO] Build started (Build ID: demo-build-1234)',
          '[INFO] Provisioning build environment (docker:20)...',
          '[SUCCESS] Environment provisioned successfully',
          '[INFO] Downloading source code...',
          '[INFO] Installing dependencies (npm install)...',
          '[SUCCESS] 23 packages installed',
          '[INFO] Building Docker image...',
          '[SUCCESS] Docker image built successfully'
        ]
      },
      {
        id: 'test',
        name: 'Unit Tests',
        duration: 5000,
        logs: [
          '[INFO] Running test suite...',
          '[SUCCESS] Unit tests: 32/32 passed',
          '[SUCCESS] Integration tests: 15/15 passed',
          '[SUCCESS] All tests passed (47/47)',
          '[INFO] Code coverage: 87%'
        ]
      },
      {
        id: 'push',
        name: 'Push to ECR',
        duration: 4000,
        logs: [
          '[INFO] Pushing image to Amazon ECR...',
          '[INFO] Uploading layers...',
          '[SUCCESS] Image pushed successfully',
          '[INFO] Image: 123456.dkr.ecr.ap-northeast-1.amazonaws.com/demo:v2.1.0'
        ]
      },
      {
        id: 'deploy',
        name: 'CodeDeploy',
        duration: 6000,
        logs: [
          '[INFO] Deployment started (ID: d-ABC123)',
          '[INFO] Creating Green environment tasks...',
          '[SUCCESS] ECS tasks created successfully',
          '[INFO] Updating task definition...',
          '[SUCCESS] Task definition updated (revision: 42)',
          '[INFO] Starting new tasks...',
          '[SUCCESS] 2 tasks started in Green environment'
        ]
      },
      {
        id: 'health',
        name: 'Health Check',
        duration: 5000,
        logs: [
          '[INFO] Running health checks...',
          '[SUCCESS] Health check 1/3 passed',
          '[SUCCESS] Health check 2/3 passed',
          '[SUCCESS] Health check 3/3 passed',
          '[INFO] Registering targets to ALB...',
          '[SUCCESS] Targets registered successfully',
          '[SUCCESS] Deployment completed successfully!'
        ]
      }
    ]

    // Execute stages sequentially
    for (const stage of stages) {
      setCurrentPipelineStage(stage.id)
      setStageStatuses(prev => ({ ...prev, [stage.id]: 'in_progress' }))

      // Add logs gradually
      for (let i = 0; i < stage.logs.length; i++) {
        await new Promise(resolve => setTimeout(resolve, stage.duration / stage.logs.length))

        const logMessage = stage.logs[i]
        addLog({
          timestamp: new Date().toISOString(),
          type: logMessage.includes('✓') ? 'success' : 'info',
          message: `[${stage.name}] ${logMessage}`
        })

        setStageLogs(prev => ({
          ...prev,
          [stage.id]: [...(prev[stage.id] || []), logMessage]
        }))
      }

      setStageStatuses(prev => ({ ...prev, [stage.id]: 'completed' }))

      // Update green metrics as deployment progresses
      if (stage.id === 'deploy') {
        updateGreenMetrics({
          cpu: 15 + Math.random() * 10,
          memory: 45 + Math.random() * 10,
          responseTime: 180 + Math.random() * 30,
          errorRate: Math.random() * 0.05
        })
      }
    }

    // Deployment complete - move to traffic screen
    setIsDeploying(false)

    addLog({
      timestamp: new Date().toISOString(),
      type: 'success',
      message: '[SUCCESS] Deployment completed! Ready for traffic shift.'
    })

    setTimeout(() => {
      if (onDeploymentComplete) {
        onDeploymentComplete()
      }
    }, 2000)
  }

  return (
    <div className="w-full h-screen overflow-y-auto relative bg-transparent">
      {/* Static Pochita */}
      <PochitaStatic />

      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/40 border-b border-white/10 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">
              Make Delightful Deployment
            </h1>
            <p className="text-white/70 text-sm">
              Real-time AWS CodePipeline, CloudWatch & X-Ray Visualization
            </p>
          </div>

          <div className="flex items-center gap-4">
            {lastUpdated && (
              <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/20 text-right">
                <div className="text-white/70 text-xs mb-1">Last Update</div>
                <div className="text-white text-sm font-semibold font-mono">
                  {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            )}

            {Array.isArray(xrayServices) && xrayServices.length > 0 && (
              <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/20 text-right">
                <div className="text-white/70 text-xs mb-1">X-Ray Services</div>
                <div className="text-white text-sm font-semibold">{xrayServices.length}</div>
              </div>
            )}

            {/* Elapsed Time */}
            {deploymentStarted && (
              <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/20">
                <div className="text-white/70 text-xs mb-1">Elapsed Time</div>
                <div className="text-white text-2xl font-bold font-mono">
                  {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                </div>
              </div>
            )}

            {/* Deploy Button */}
            {!deploymentStarted && (
              <motion.button
                onClick={startDeployment}
                disabled={isDeploying}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-4 px-8 rounded-xl shadow-2xl text-xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isDeploying ? 'Deploying...' : 'Start Deployment'}
              </motion.button>
            )}

            {/* Status Badge */}
            <div className={`px-4 py-2 rounded-lg font-bold ${
              isDeploying
                ? 'bg-yellow-500 text-black'
                : deploymentStarted
                  ? 'bg-green-500 text-black'
                  : 'bg-gray-600 text-white'
            }`}>
              {isDeploying ? 'DEPLOYING' : deploymentStarted ? 'COMPLETE' : 'READY'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 space-y-8">
        {/* Pipeline Stages */}
        {deploymentStarted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/30 rounded-2xl p-6 border border-white/10"
          >
            <PipelineStages
              currentStage={currentPipelineStage}
              stageStatuses={stageStatuses}
              stageLogs={stageLogs}
            />
          </motion.div>
        )}

        {/* CloudWatch Metrics - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
        >
          <CloudWatchMetrics
            blueMetrics={blueMetrics}
            greenMetrics={greenMetrics}
            blueHistory={blueHistory}
            greenHistory={greenHistory}
          />
        </motion.div>

        {/* Logs */}
        {logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/30 rounded-2xl p-6 border border-white/10"
          >
            <h3 className="text-white text-2xl font-bold mb-4">
              Deployment Logs
            </h3>
            <div className="h-64 rounded-xl overflow-hidden bg-black/50">
              <LogStream logs={logs} />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
