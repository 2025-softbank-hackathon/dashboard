import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const PIPELINE_STAGES = [
  {
    id: 'commit',
    name: 'CodeCommit',
    icon: '↓',
    description: 'Source code retrieved'
  },
  {
    id: 'build',
    name: 'CodeBuild',
    icon: '⚙',
    description: 'Building Docker image'
  },
  {
    id: 'test',
    name: 'Unit Tests',
    icon: '✓',
    description: 'Running test suite'
  },
  {
    id: 'push',
    name: 'Push to ECR',
    icon: '↑',
    description: 'Pushing to registry'
  },
  {
    id: 'deploy',
    name: 'CodeDeploy',
    icon: '▶',
    description: 'Deploying to EC2'
  },
  {
    id: 'health',
    name: 'Health Check',
    icon: '+',
    description: 'Verifying deployment'
  }
]

function StageBox({ stage, status, logs, isActive }) {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'from-green-500 to-green-600'
      case 'in_progress':
        return 'from-blue-500 to-blue-600'
      case 'failed':
        return 'from-red-500 to-red-600'
      default:
        return 'from-gray-600 to-gray-700'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return '✓'
      case 'in_progress':
        return '⟳'
      case 'failed':
        return '✗'
      default:
        return '○'
    }
  }

  const getBorderColor = () => {
    switch (status) {
      case 'completed':
        return 'border-green-400'
      case 'in_progress':
        return 'border-blue-400'
      case 'failed':
        return 'border-red-400'
      default:
        return 'border-gray-600'
    }
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{
        scale: isActive ? 1.05 : 1,
        opacity: 1
      }}
      transition={{ duration: 0.3 }}
      className={`relative bg-gradient-to-br ${getStatusColor()} rounded-xl p-4 border-4 ${getBorderColor()} shadow-2xl min-w-[180px]`}
    >
      {/* Status Badge */}
      <div className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center text-2xl shadow-lg">
        {getStatusIcon()}
      </div>

      {/* Stage Icon */}
      <div className="text-5xl mb-2 text-center">{stage.icon}</div>

      {/* Stage Name */}
      <div className="text-white font-bold text-center text-lg mb-1">
        {stage.name}
      </div>

      {/* Description */}
      <div className="text-white/80 text-xs text-center">
        {stage.description}
      </div>

      {/* Progress Animation */}
      {status === 'in_progress' && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-white"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Logs Preview */}
      {logs && logs.length > 0 && isActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-20 left-0 right-0 bg-black/90 rounded-lg p-2 text-xs text-green-400 font-mono max-h-16 overflow-y-auto"
        >
          {logs.slice(-3).map((log, idx) => (
            <div key={idx} className="truncate">{log}</div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}

export default function PipelineStages({ currentStage, stageStatuses, stageLogs }) {
  return (
    <div className="w-full">
      <h3 className="text-white text-2xl font-bold mb-6 text-center">
        Deployment Pipeline
      </h3>

      <div className="flex items-center justify-center gap-4 flex-wrap">
        {PIPELINE_STAGES.map((stage, index) => (
          <div key={stage.id} className="flex items-center">
            <StageBox
              stage={stage}
              status={stageStatuses[stage.id] || 'pending'}
              logs={stageLogs[stage.id] || []}
              isActive={currentStage === stage.id}
            />

            {/* Arrow between stages */}
            {index < PIPELINE_STAGES.length - 1 && (
              <motion.div
                className="text-white text-3xl mx-2"
                animate={{
                  x: [0, 5, 0],
                  opacity: stageStatuses[stage.id] === 'completed' ? 1 : 0.3
                }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                →
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Overall Progress */}
      <div className="mt-8 mx-auto max-w-2xl">
        <div className="flex justify-between text-white text-sm mb-2">
          <span>Overall Progress</span>
          <span className="font-bold">
            {Math.round((Object.values(stageStatuses).filter(s => s === 'completed').length / PIPELINE_STAGES.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500"
            initial={{ width: '0%' }}
            animate={{
              width: `${(Object.values(stageStatuses).filter(s => s === 'completed').length / PIPELINE_STAGES.length) * 100}%`
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  )
}
