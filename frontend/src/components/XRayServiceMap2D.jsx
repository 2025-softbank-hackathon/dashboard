import { motion } from 'framer-motion'

export default function XRayServiceMap2D({ services = [], showGreen = true }) {
  // Clean circular layout inspired by AWS X-Ray service map
  const architecture = {
    // Central node - ALB
    alb: { x: 375, y: 275, label: 'ALB', color: 'bg-pink-500', ringColor: 'border-pink-400' },

    // Left - User/Client
    user: { x: 100, y: 275, label: 'Client', color: 'bg-purple-500', ringColor: 'border-purple-400' },

    // Top row - DynamoDB services
    dynamoServices: [
      { x: 375, y: 80, label: 'User Table', color: 'bg-green-500', ringColor: 'border-green-400' },
      { x: 600, y: 120, label: 'SNS', color: 'bg-red-500', ringColor: 'border-red-400' }
    ],

    // Middle row - Blue/Green environments
    environments: [
      ...(showGreen ? [
        { x: 600, y: 275, label: 'Green-ECS', color: 'bg-green-500', ringColor: 'border-green-400' }
      ] : [])
    ],

    // Bottom row - Backend services
    backendServices: [
      { x: 250, y: 420, label: 'Move Table', color: 'bg-green-500', ringColor: 'border-green-400' },
      { x: 500, y: 420, label: 'Game Table', color: 'bg-green-500', ringColor: 'border-green-400' },
      { x: 375, y: 520, label: 'State Table', color: 'bg-green-500', ringColor: 'border-green-400' },
      { x: 150, y: 500, label: 'Session Table', color: 'bg-green-500', ringColor: 'border-green-400' }
    ]
  }

  // Connection lines - radial from center
  const connections = [
    // User to ALB
    { from: architecture.user, to: architecture.alb, color: 'stroke-gray-400' },

    // ALB to top services
    ...architecture.dynamoServices.map(service => ({
      from: architecture.alb,
      to: service,
      color: 'stroke-gray-400'
    })),

    // ALB to environments
    ...architecture.environments.map(env => ({
      from: architecture.alb,
      to: env,
      color: 'stroke-gray-400'
    })),

    // ALB to backend services
    ...architecture.backendServices.map(service => ({
      from: architecture.alb,
      to: service,
      color: 'stroke-gray-400'
    }))
  ]

  return (
    <div className="w-full h-full relative bg-black/10 rounded-xl overflow-hidden flex items-center justify-center">
      {/* SVG for connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }} viewBox="0 0 750 600" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Animated gradient for lines */}
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.3)" />
            <stop offset="50%" stopColor="rgba(99, 102, 241, 0.6)" />
            <stop offset="100%" stopColor="rgba(99, 102, 241, 0.3)" />
          </linearGradient>
        </defs>

        {connections.map((conn, i) => (
          <motion.line
            key={i}
            x1={conn.from.x + 50}
            y1={conn.from.y + 50}
            x2={conn.to.x + 50}
            y2={conn.to.y + 50}
            className={conn.color}
            strokeWidth="3"
            strokeDasharray="8,4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.5 }}
            transition={{ duration: 1, delay: i * 0.1 }}
          />
        ))}
      </svg>

      {/* Nodes Container with proper scaling */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
        <div className="relative" style={{ width: '750px', height: '600px' }}>
          {/* User/Client */}
          <CircularNode node={architecture.user} delay={0} />

          {/* Central ALB */}
          <CircularNode node={architecture.alb} delay={0.1} />

          {/* Top DynamoDB Services */}
          {architecture.dynamoServices.map((node, i) => (
            <CircularNode key={`dynamo-${i}`} node={node} delay={0.2 + i * 0.1} />
          ))}

          {/* Environments */}
          {architecture.environments.map((node, i) => (
            <CircularNode key={`env-${i}`} node={node} delay={0.4 + i * 0.1} />
          ))}

          {/* Backend Services */}
          {architecture.backendServices.map((node, i) => (
            <CircularNode key={`backend-${i}`} node={node} delay={0.6 + i * 0.1} />
          ))}
        </div>
      </div>
    </div>
  )
}

function CircularNode({ node, delay }) {
  // Generate realistic metrics
  const avgTime = Math.floor(Math.random() * 500) + 50
  const throughput = (Math.random() * 10).toFixed(1)

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6, delay, type: 'spring', stiffness: 100 }}
      className="absolute"
      style={{
        left: node.x - 55,
        top: node.y - 55,
        width: '110px',
        height: '110px'
      }}
    >
      {/* Outer ring with metrics */}
      <div className={`w-full h-full rounded-full border-4 ${node.ringColor} bg-white/5 backdrop-blur-sm flex items-center justify-center relative shadow-xl cursor-pointer hover:scale-110 transition-transform`}>
        {/* Inner circle */}
        <div className={`w-20 h-20 rounded-full ${node.color} flex items-center justify-center shadow-lg`}>
          <div className="text-center">
            <div className="text-white text-xs font-bold">avg {avgTime}ms</div>
            <div className="text-white text-[10px] opacity-80">{throughput} t/min</div>
          </div>
        </div>
      </div>

      {/* Label below */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg">
          {node.label}
        </div>
        <div className="text-white/60 text-[10px] text-center">
          AWS::{node.label.includes('Table') ? 'DynamoDB' : node.label.includes('SNS') ? 'SNS' : node.label.includes('ECS') ? 'ECS' : 'Service'}
        </div>
      </div>

      {/* Pulse animation */}
      <motion.div
        className={`absolute inset-0 rounded-full border-4 ${node.ringColor} opacity-40`}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.4, 0, 0.4]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeOut'
        }}
      />
    </motion.div>
  )
}
