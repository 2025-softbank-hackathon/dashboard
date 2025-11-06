import { motion } from 'framer-motion'

export default function XRayServiceMap2D({ services = [], showGreen = true }) {
  // Clean circular layout matching the reference image - spread out widely
  const architecture = {
    // Left - Client
    user: { x: 100, y: 300, label: 'Clients', color: 'bg-gray-500', ringColor: 'border-gray-400', icon: '👥' },

    // Central node - Main service (Scorekeep)
    alb: { x: 350, y: 300, label: 'Scorekeep', color: 'bg-green-500', ringColor: 'border-green-400', subtitle: 'AWS::ElasticBeanstalk::Environment' },

    // Top row - spread out
    dynamoServices: [
      { x: 550, y: 100, label: 'scorekeep-user', color: 'bg-green-500', ringColor: 'border-green-400', subtitle: 'AWS::DynamoDB::Table' },
      { x: 900, y: 100, label: 'SNS', color: 'bg-red-500', ringColor: 'border-red-400', subtitle: 'AWS::SNS' }
    ],

    // Right middle
    environments: [
      { x: 700, y: 300, label: 'scorekeep-move', color: 'bg-green-500', ringColor: 'border-green-400', subtitle: 'AWS::DynamoDB::Table' },
      { x: 1050, y: 300, label: 'scorekeep-game', color: 'bg-green-500', ringColor: 'border-green-400', subtitle: 'AWS::DynamoDB::Table' }
    ],

    // Bottom row - spread out
    backendServices: [
      { x: 550, y: 500, label: 'scorekeep-state', color: 'bg-green-500', ringColor: 'border-green-400', subtitle: 'AWS::DynamoDB::Table' },
      { x: 900, y: 500, label: 'scorekeep-session', color: 'bg-green-500', ringColor: 'border-green-400', subtitle: 'AWS::DynamoDB::Table' }
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
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }} viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid meet">
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
            x1={conn.from.x}
            y1={conn.from.y}
            x2={conn.to.x}
            y2={conn.to.y}
            className={conn.color}
            strokeWidth="2"
            strokeDasharray="5,5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.3 }}
            transition={{ duration: 1, delay: i * 0.1 }}
          />
        ))}
      </svg>

      {/* Nodes Container with proper scaling */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
        <div className="relative" style={{ width: '1200px', height: '600px', transform: 'scale(0.85)' }}>
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
        left: node.x - 80,
        top: node.y - 80,
        width: '160px',
        height: '160px'
      }}
    >
      {/* Outer ring with metrics */}
      <div className={`w-full h-full rounded-full border-5 ${node.ringColor} bg-white/5 flex items-center justify-center relative shadow-xl cursor-pointer hover:scale-105 transition-transform`}>
        {/* Inner circle */}
        <div className={`w-32 h-32 rounded-full ${node.color} flex items-center justify-center shadow-lg`}>
          <div className="text-center">
            <div className="text-white text-base font-bold">avg {avgTime}ms</div>
            <div className="text-white text-sm opacity-80">{throughput} t/min</div>
          </div>
        </div>
      </div>

      {/* Label below */}
      <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        <div className="text-white text-base font-semibold text-center drop-shadow-lg">
          {node.label}
        </div>
        <div className="text-white/60 text-sm text-center">
          {node.subtitle || `AWS::${node.label.includes('Table') ? 'DynamoDB' : node.label.includes('SNS') ? 'SNS' : 'Service'}`}
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
