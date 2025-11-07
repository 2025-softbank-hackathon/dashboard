import { motion } from 'framer-motion'

const NODE_COLORS = {
  api: { base: 'bg-indigo-500', ring: 'border-indigo-300' },
  gateway: { base: 'bg-indigo-500', ring: 'border-indigo-300' },
  awsproxy: { base: 'bg-sky-500', ring: 'border-sky-300' },
  lambda: { base: 'bg-purple-500', ring: 'border-purple-300' },
  service: { base: 'bg-blue-500', ring: 'border-blue-300' },
  database: { base: 'bg-emerald-500', ring: 'border-emerald-300' },
  dynamodb: { base: 'bg-emerald-500', ring: 'border-emerald-300' },
  sqs: { base: 'bg-amber-500', ring: 'border-amber-300' },
  sns: { base: 'bg-pink-500', ring: 'border-pink-300' },
  default: { base: 'bg-gray-500', ring: 'border-gray-300' },
}

const CANVAS = {
  width: 1200,
  height: 600,
  radius: 260,
}

function normalizeType(type) {
  if (!type) return 'default'
  const lower = type.toLowerCase()
  if (lower.includes('api') || lower.includes('gateway')) return 'api'
  if (lower.includes('lambda')) return 'lambda'
  if (lower.includes('dynamo') || lower.includes('database')) return 'database'
  if (lower.includes('sns')) return 'sns'
  if (lower.includes('sqs')) return 'sqs'
  if (lower.includes('proxy')) return 'awsproxy'
  return lower in NODE_COLORS ? lower : 'service'
}

function buildGraphLayout(services) {
  if (!services.length) {
    return { nodes: [], edges: [] }
  }

  const center = { x: CANVAS.width / 2, y: CANVAS.height / 2 }
  const incomingCounts = new Map()

  services.forEach((service) => {
    service.edges?.forEach((edge) => {
      const target = edge?.targetId
      if (!target) return
      incomingCounts.set(target, (incomingCounts.get(target) || 0) + 1)
    })
  })

  let root = services[0]
  for (const service of services) {
    const incoming = incomingCounts.get(service.id) || 0
    if (incoming === 0) {
      root = service
      break
    }
  }

  const otherServices = services.filter((service) => service.id !== root.id)
  const nodes = []

  const rootNode = {
    ...root,
    position: center,
    color: NODE_COLORS[normalizeType(root.type)] || NODE_COLORS.default,
  }
  nodes.push(rootNode)

  otherServices.forEach((service, index) => {
    const angle = (2 * Math.PI * index) / Math.max(otherServices.length, 1)
    const dynamicRadius = CANVAS.radius + (service.type?.toLowerCase().includes('database') ? 80 : 0)
    const node = {
      ...service,
      position: {
        x: center.x + Math.cos(angle) * dynamicRadius,
        y: center.y + Math.sin(angle) * dynamicRadius,
      },
      color: NODE_COLORS[normalizeType(service.type)] || NODE_COLORS.default,
    }
    nodes.push(node)
  })

  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const edges = []

  services.forEach((service) => {
    const from = nodeMap.get(service.id)
    if (!from) return

    service.edges?.forEach((edge) => {
      if (!edge?.targetId) return
      const to = nodeMap.get(edge.targetId)
      if (!to) return

      edges.push({
        from: from.position,
        to: to.position,
        metrics: {
          averageResponseTimeMs: edge.averageResponseTimeMs,
          requestCount: edge.requestCount,
          errorCount: edge.errorCount,
        },
      })
    })
  })

  return { nodes, edges }
}

function formatStat(value, suffix = '', fallback = 'n/a') {
  if (!Number.isFinite(value)) {
    return fallback
  }
  if (suffix === 'ms') {
    return `${Math.round(value)} ms`
  }
  if (suffix === 'req') {
    return `${value.toLocaleString()} req`
  }
  if (suffix === 'err') {
    return `${value.toLocaleString()} errors`
  }
  return `${value.toLocaleString()}${suffix}`
}

function ServiceNode({ node, delay }) {
  const { position, color } = node
  const stats = [
    { label: 'Latency', value: formatStat(node.averageResponseTimeMs, 'ms') },
    { label: 'Requests', value: formatStat(node.requestCount, 'req') },
    { label: 'Errors', value: formatStat(node.errorCount, 'err') },
  ]

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6, delay, type: 'spring', stiffness: 120 }}
      className="absolute"
      style={{
        left: position.x - 110,
        top: position.y - 110,
        width: 220,
        height: 220,
      }}
    >
      <div className={`w-full h-full rounded-full border-4 ${color.ring} bg-black/50 flex flex-col items-center justify-center shadow-xl`}
        >
        <div className={`w-40 h-40 rounded-full ${color.base} flex flex-col items-center justify-center text-center px-3`}
          >
          <div className="text-white text-base font-semibold leading-tight mb-1">
            {node.name}
          </div>
          <div className="text-white/70 text-xs uppercase tracking-wider">
            {node.type || 'service'}
          </div>
        </div>
        <div className="mt-3 space-y-1 text-center">
          {stats.map((stat) => (
            <div key={stat.label} className="text-xs text-white/70">
              <span className="font-semibold text-white/90 mr-1">{stat.label}:</span>
              {stat.value}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default function XRayServiceMap2D({ services = [] }) {
  const { nodes, edges } = buildGraphLayout(services)

  if (!nodes.length) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/20 rounded-xl border border-white/10">
        <div className="text-white/60 text-sm">Waiting for AWS X-Ray service map data...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative bg-black/10 rounded-xl overflow-hidden flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.15)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.6)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.15)" />
          </linearGradient>
        </defs>

        {edges.map((edge, index) => (
          <motion.line
            key={`${edge.from.x}-${edge.to.x}-${index}`}
            x1={edge.from.x}
            y1={edge.from.y}
            x2={edge.to.x}
            y2={edge.to.y}
            stroke="url(#edgeGradient)"
            strokeWidth="3"
            strokeDasharray="6,6"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.45 }}
            transition={{ duration: 1.2, delay: index * 0.05 }}
          />
        ))}
      </svg>

      <div className="absolute inset-0" style={{ width: CANVAS.width, height: CANVAS.height }}>
        {nodes.map((node, index) => (
          <ServiceNode key={node.id || index} node={node} delay={0.1 + index * 0.05} />
        ))}
      </div>
    </div>
  )
}
