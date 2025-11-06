import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import useDeploymentStore from '../store/useDeploymentStore'
import { playSound } from '../utils/sounds'
import Infrastructure3D from './Infrastructure3D'
import MetricsChart from './MetricsChart'
import LogStream from './LogStream'
import XRayServiceMap from './XRayServiceMap'

export default function InfrastructureScreen() {
  const {
    setCurrentScreen,
    deployProgress,
    setDeployProgress,
    logs,
    addLog,
    blueMetrics,
    greenMetrics
  } = useDeploymentStore()

  const [resources, setResources] = useState([])
  const [showGreen, setShowGreen] = useState(false)
  const [blueCpuHistory, setBlueCpuHistory] = useState(Array(30).fill(45))
  const [greenCpuHistory, setGreenCpuHistory] = useState(Array(30).fill(0))
  const [elapsedTime, setElapsedTime] = useState(0)
  const [pipelineStage, setPipelineStage] = useState('') // CodeBuild, CodeDeploy stages

  useEffect(() => {
    // Pipeline stages with detailed logs
    const pipelineStages = [
      {
        name: 'CodeCommit',
        logs: [
          { type: 'info', message: '📥 [CodeCommit] Fetching latest commit...' },
          { type: 'success', message: '✅ [CodeCommit] Commit sha: abc123 retrieved' }
        ]
      },
      {
        name: 'CodeBuild',
        logs: [
          { type: 'info', message: '🔨 [CodeBuild] Build started (Build ID: softbank-demo:1234)' },
          { type: 'info', message: '📦 [CodeBuild] Provisioning build environment...' },
          { type: 'success', message: '✅ [CodeBuild] Environment ready (docker:20)' },
          { type: 'info', message: '⬇️ [CodeBuild] Downloading source' },
          { type: 'info', message: '🔧 [CodeBuild] Installing dependencies...' },
          { type: 'success', message: '✅ [CodeBuild] Dependencies installed (23 packages)' },
          { type: 'info', message: '🧪 [CodeBuild] Running tests...' },
          { type: 'success', message: '✅ [CodeBuild] All tests passed (47/47)' },
          { type: 'info', message: '🏗️ [CodeBuild] Building Docker image...' },
          { type: 'success', message: '✅ [CodeBuild] Image built successfully' },
          { type: 'info', message: '📤 [CodeBuild] Pushing to ECR...' },
          { type: 'success', message: '✅ [CodeBuild] Image pushed: 123456.dkr.ecr.ap-northeast-1.amazonaws.com/softbank-demo:v2.1.0' },
          { type: 'success', message: '🎉 [CodeBuild] Build completed in 2m 34s' }
        ]
      },
      {
        name: 'Terraform Apply',
        logs: [
          { type: 'info', message: '🔧 [Terraform] Applying infrastructure changes...' },
          { type: 'info', message: '📋 [Terraform] aws_ecs_service.green: Creating...' },
          { type: 'success', message: '✅ [Terraform] aws_ecs_service.green: Created' },
          { type: 'info', message: '📋 [Terraform] aws_ecs_task_definition.green: Creating...' },
          { type: 'success', message: '✅ [Terraform] aws_ecs_task_definition.green: Created' },
          { type: 'info', message: '📋 [Terraform] aws_lb_target_group.green: Creating...' },
          { type: 'success', message: '✅ [Terraform] aws_lb_target_group.green: Created' },
          { type: 'success', message: '🎉 [Terraform] Apply complete! Resources: 4 added, 0 changed, 0 destroyed' }
        ]
      },
      {
        name: 'CodeDeploy',
        logs: [
          { type: 'info', message: '🚀 [CodeDeploy] Deployment started (ID: d-ABCD1234)' },
          { type: 'info', message: '🎯 [CodeDeploy] Creating new task in Green environment...' },
          { type: 'success', message: '✅ [CodeDeploy] Task created (task-abc123)' },
          { type: 'info', message: '💚 [CodeDeploy] Starting health checks...' },
          { type: 'success', message: '✅ [CodeDeploy] Health check 1/3 passed' },
          { type: 'success', message: '✅ [CodeDeploy] Health check 2/3 passed' },
          { type: 'success', message: '✅ [CodeDeploy] Health check 3/3 passed' },
          { type: 'info', message: '🔄 [CodeDeploy] Registering target to ALB...' },
          { type: 'success', message: '✅ [CodeDeploy] Target registered successfully' },
          { type: 'success', message: '🎉 [CodeDeploy] Deployment completed successfully!' }
        ]
      }
    ]

    let logIndex = 0
    let stageIndex = 0

    const logAllStages = () => {
      if (stageIndex >= pipelineStages.length) return

      const stage = pipelineStages[stageIndex]
      setPipelineStage(stage.name)

      const stageLogs = stage.logs
      const logInterval = setInterval(() => {
        if (logIndex < stageLogs.length) {
          addLog({
            timestamp: new Date().toISOString(),
            ...stageLogs[logIndex]
          })
          playSound('build')
          logIndex++
        } else {
          clearInterval(logInterval)
          logIndex = 0
          stageIndex++
          setTimeout(logAllStages, 500)
        }
      }, 400)
    }

    logAllStages()

    // Terraform resources
    const terraformResources = [
      { type: 'aws_ecs_service', name: 'green', action: 'create', icon: '🚀' },
      { type: 'aws_ecs_task_definition', name: 'green', action: 'create', icon: '📦' },
      { type: 'aws_lb_target_group', name: 'green', action: 'create', icon: '🎯' },
      { type: 'aws_lb_listener_rule', name: 'green', action: 'create', icon: '🔀' }
    ]

    // Show resources
    terraformResources.forEach((resource, index) => {
      setTimeout(() => {
        setResources(prev => [...prev, resource])
      }, index * 800 + 5000)
    })

    // Show Green 3D block
    setTimeout(() => {
      setShowGreen(true)
      addLog({
        timestamp: new Date().toISOString(),
        type: 'success',
        message: 'Green environment deployment started'
      })
    }, 2000)

    // Start deployment progress
    const progressInterval = setInterval(() => {
      setDeployProgress(prev => {
        const next = prev + 2
        if (next >= 100) {
          clearInterval(progressInterval)
          addLog({
            timestamp: new Date().toISOString(),
            type: 'success',
            message: '🎉 Deployment completed successfully!'
          })
          setTimeout(() => {
            playSound('complete')
            setCurrentScreen('traffic')
          }, 2000)
          return 100
        }

        // Add random logs
        if (next % 20 === 0) {
          const logMessages = [
            { type: 'info', message: 'Building Docker image...' },
            { type: 'success', message: 'Tests passed (47/47)' },
            { type: 'info', message: 'Pushing to ECR...' },
            { type: 'success', message: 'Health check passed' },
            { type: 'info', message: 'Updating ECS service...' }
          ]
          const randomLog = logMessages[Math.floor(Math.random() * logMessages.length)]
          addLog({
            timestamp: new Date().toISOString(),
            ...randomLog
          })
        }

        return next
      })
    }, 100)

    // Update elapsed time
    const timeInterval = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    // Update metrics history
    const metricsInterval = setInterval(() => {
      setBlueCpuHistory(prev => [...prev.slice(1), blueMetrics.cpu + Math.random() * 10 - 5])
      setGreenCpuHistory(prev => [
        ...prev.slice(1),
        deployProgress > 50 ? greenMetrics.cpu + Math.random() * 5 - 2.5 : 0
      ])
    }, 1000)

    return () => {
      clearInterval(progressInterval)
      clearInterval(timeInterval)
      clearInterval(metricsInterval)
    }
  }, [])

  return (
    <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      <h2 className="absolute top-4 left-1/2 transform -translate-x-1/2 text-3xl font-bold text-white z-20">
        🏗️ Infrastructure Deployment
      </h2>

      {/* Pipeline Stage Indicator */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 flex gap-3 items-center z-20">
        {pipelineStage && (
          <div className="glassmorphism px-6 py-3 rounded-lg flex items-center gap-3 animate-pulse">
            <div className="w-3 h-3 bg-success-400 rounded-full"></div>
            <span className="text-white text-base font-bold">{pipelineStage}</span>
          </div>
        )}
        <div className="glassmorphism px-4 py-2 rounded-lg flex items-center gap-2">
          <span className="text-white/60 text-xs">Mock Data</span>
        </div>
      </div>

      {/* Terraform Panel - Left */}
      <div className="absolute top-28 left-4 w-80 glassmorphism rounded-2xl p-5 shadow-2xl z-10 max-h-[calc(100vh-150px)] overflow-hidden flex flex-col">
        <h3 className="text-success-400 text-lg font-bold mb-3">📋 Terraform Plan</h3>
        <div className="space-y-2 overflow-y-auto flex-1 pr-2">
          {resources.map((resource, index) => (
            <motion.div
              key={index}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-white/10 rounded-lg p-2 border-l-4 border-success-400 text-sm"
            >
              <span className="inline-block bg-success-400 text-black px-2 py-0.5 rounded text-xs font-bold mr-2">
                {resource.action.toUpperCase()}
              </span>
              <span className="text-white">{resource.icon} {resource.type}.{resource.name}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Metrics Panel - Right */}
      <div className="absolute top-28 right-4 w-96 glassmorphism rounded-2xl p-5 shadow-2xl z-10">
        <h3 className="text-success-400 text-lg font-bold mb-3">📊 Deployment Progress</h3>

        <div className="space-y-4">
          {/* Progress */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-white text-sm">Progress</span>
              <span className="text-success-400 text-2xl font-bold">{deployProgress}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-success-400 to-success-600"
                style={{ width: `${deployProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Elapsed Time */}
          <div className="flex justify-between text-white">
            <span>⏱️ Elapsed:</span>
            <span className="font-bold">{Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}</span>
          </div>

          {/* CPU Chart */}
          <div className="mt-4">
            <MetricsChart
              blueData={blueCpuHistory}
              greenData={greenCpuHistory}
              label="CPU Usage (%)"
            />
          </div>
        </div>
      </div>

      {/* 3D Scenes - Center (Both) */}
      <div className="absolute top-28 left-[22rem] right-[26rem] bottom-[22rem] flex gap-4 pointer-events-none">
        {/* Infrastructure 3D */}
        <div className="flex-1 glassmorphism rounded-2xl overflow-hidden pointer-events-auto">
          <div className="bg-white/10 px-4 py-2 text-white font-bold text-sm">
            🏗️ Infrastructure Blocks
          </div>
          <div className="h-[calc(100%-2.5rem)]">
            <Infrastructure3D showGreen={showGreen} />
          </div>
        </div>

        {/* X-Ray Service Map */}
        <div className="flex-1 glassmorphism rounded-2xl overflow-hidden pointer-events-auto">
          <div className="bg-white/10 px-4 py-2 text-white font-bold text-sm">
            🔍 X-Ray Service Map
          </div>
          <div className="h-[calc(100%-2.5rem)]">
            <XRayServiceMap />
          </div>
        </div>
      </div>

      {/* Logs Panel - Bottom (Larger) */}
      <div className="absolute bottom-4 left-4 right-4 glassmorphism rounded-2xl p-5 shadow-2xl z-10 h-80">
        <h3 className="text-success-400 text-lg font-bold mb-3">📝 Deployment Pipeline Logs</h3>
        <div className="h-64">
          <LogStream logs={logs} />
        </div>
      </div>

      {/* Environment Cards - Bottom Left (adjusted for larger logs) */}
      <div className="absolute bottom-[21rem] left-4 flex gap-4 z-10">
        <EnvironmentCard
          name="Blue"
          status="Running"
          color="blue"
          metrics={{
            cpu: blueMetrics.cpu.toFixed(1),
            memory: blueMetrics.memory.toFixed(1),
            responseTime: blueMetrics.responseTime,
            traffic: 100
          }}
        />
        <EnvironmentCard
          name="Green"
          status={deployProgress >= 100 ? 'Running' : 'Deploying'}
          color="green"
          metrics={{
            cpu: deployProgress > 50 ? greenMetrics.cpu.toFixed(1) : '--',
            memory: deployProgress > 50 ? greenMetrics.memory.toFixed(1) : '--',
            responseTime: deployProgress > 50 ? greenMetrics.responseTime : '--',
            traffic: 0
          }}
        />
      </div>
    </div>
  )
}

function EnvironmentCard({ name, status, color, metrics }) {
  const borderColor = color === 'blue' ? 'border-blue-400' : 'border-success-400'
  const statusColor = status === 'Running' ? 'bg-success-400' : 'bg-yellow-400'

  return (
    <div className={`w-56 glassmorphism rounded-xl p-4 shadow-2xl border-2 ${borderColor}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white">
          {color === 'blue' ? '💙' : '💚'} {name}
        </h3>
        <div className={`${statusColor} text-black px-2 py-1 rounded-full text-xs font-bold`}>
          {status}
        </div>
      </div>
      <div className="space-y-1 text-sm text-white">
        <div className="flex justify-between">
          <span>CPU:</span>
          <span className="font-bold text-success-400">{metrics.cpu}%</span>
        </div>
        <div className="flex justify-between">
          <span>Memory:</span>
          <span className="font-bold text-success-400">{metrics.memory}%</span>
        </div>
        <div className="flex justify-between">
          <span>Response:</span>
          <span className="font-bold text-success-400">{metrics.responseTime}ms</span>
        </div>
        <div className="flex justify-between">
          <span>Traffic:</span>
          <span className="font-bold text-success-400">{metrics.traffic}%</span>
        </div>
      </div>
    </div>
  )
}
