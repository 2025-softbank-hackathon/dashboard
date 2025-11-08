import { motion } from 'framer-motion'
import useDeploymentStore from '../store/useDeploymentStore'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

function MetricCard({ title, value, unit, trend, label, color = 'blue' }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-700',
    green: 'from-green-500 to-green-700',
    yellow: 'from-yellow-500 to-yellow-700',
    red: 'from-red-500 to-red-700',
    purple: 'from-purple-500 to-purple-700'
  }

  return (
    <motion.div
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 shadow-xl`}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="text-2xl font-bold text-white">{label}</div>
        {trend && (
          <div className={`text-sm font-bold px-2 py-1 rounded ${
            trend > 0 ? 'bg-red-500' : 'bg-green-500'
          } text-white`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-white/70 text-sm mb-1">{title}</div>
      <div className="text-white text-3xl font-bold">
        {value}
        <span className="text-xl ml-1">{unit}</span>
      </div>
    </motion.div>
  )
}

function RealtimeChart({ data, labels, label, color = 'rgb(59, 130, 246)' }) {
  const chartData = {
    labels: labels,
    datasets: [
      {
        label: label,
        data: data,
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 3
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: color,
        borderWidth: 2
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          maxTicksLimit: 10
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  }

  return (
    <div className="h-full">
      <Line data={chartData} options={options} />
    </div>
  )
}

export default function CloudWatchMetrics({ blueMetrics, greenMetrics, blueHistory, greenHistory }) {
  const timeLabels = [...Array(30)].map((_, i) => {
    const time = new Date(Date.now() - (29 - i) * 2000)
    return time.toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' })
  })

  const { metricsLoading } = useDeploymentStore()

  if (metricsLoading) {
    return (
      <div className="w-full space-y-6">
        <div className="w-full">
          <div className="mb-4 text-white/80 text-sm">Fetching AWS metrics...</div>
          <div className="grid grid-cols-2 gap-6">
            {[0,1].map((i) => (
              <div key={i} className="space-y-4">
                <div className="h-6 w-40 bg-white/10 animate-pulse rounded" />
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(4)].map((_, idx) => (
                    <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="h-4 w-24 bg-white/10 animate-pulse rounded mb-2" />
                      <div className="h-8 w-20 bg-white/20 animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-white text-2xl font-bold">
          CloudWatch Real-time Metrics
        </h3>
        <motion.div
          className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-lg border-2 border-green-500"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-green-400 font-bold text-sm">Live</span>
        </motion.div>
      </div>


      {/* Real-time Chart: CPU (Blue/Green average) */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
        <h4 className="text-white font-bold mb-4">CPU Usage Over Time (Average)</h4>
        <div className="h-48">
          {(() => {
            const cpuBlue = (blueHistory && blueHistory.cpu) || []
            const cpuGreen = (greenHistory && greenHistory.cpu) || []
            const len = Math.max(cpuBlue.length, cpuGreen.length)
            const avgCpu = Array.from({ length: len }, (_, i) => {
              const b = cpuBlue[i]
              const g = cpuGreen[i]
              const bn = typeof b === 'number' && !Number.isNaN(b) ? b : null
              const gn = typeof g === 'number' && !Number.isNaN(g) ? g : null
              if (bn != null && gn != null) return (bn + gn) / 2
              return bn ?? gn ?? null
            })
            return (
              <RealtimeChart
                data={avgCpu}
                labels={timeLabels}
                label="Average CPU (Blue + Green)"
                color="rgb(168, 85, 247)" /* purple */
              />
            )
          })()}
        </div>
      </div>
    </div>
  )
}
