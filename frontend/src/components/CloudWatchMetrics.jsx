import { motion } from 'framer-motion'
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

function formatNumber(value, options = {}) {
  if (!Number.isFinite(value)) {
    return '--'
  }
  return value.toLocaleString(undefined, options)
}

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
        {Number.isFinite(value) ? value : '--'}
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

      {/* Environment Comparison */}
      <div className="grid grid-cols-2 gap-6">
        {/* Blue Environment Metrics */}
        <div className="space-y-4">
          <div className="text-center">
            <h4 className="text-blue-400 text-xl font-bold mb-4">Blue Environment</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="CPU Usage"
              value={Number.isFinite(blueMetrics.cpu) ? parseFloat(blueMetrics.cpu.toFixed(1)) : undefined}
              unit="%"
              trend={Math.random() > 0.5 ? 2 : -2}
              label="CPU"
              color="blue"
            />
            <MetricCard
              title="Memory"
              value={Number.isFinite(blueMetrics.memory) ? parseFloat(blueMetrics.memory.toFixed(1)) : undefined}
              unit="%"
              trend={Math.random() > 0.5 ? 1 : -1}
              label="MEM"
              color="blue"
            />
            <MetricCard
              title="Response Time"
              value={Number.isFinite(blueMetrics.responseTime) ? Math.round(blueMetrics.responseTime) : undefined}
              unit="ms"
              trend={Math.random() > 0.5 ? 5 : -3}
              label="RT"
              color="yellow"
            />
            <MetricCard
              title="Error Rate"
              value={Number.isFinite(blueMetrics.errorRate) ? parseFloat((blueMetrics.errorRate * 100).toFixed(2)) : undefined}
              unit="%"
              trend={Math.random() > 0.5 ? 0.5 : -0.3}
              label="ERR"
              color="red"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 rounded-lg p-4 border border-blue-400/20">
              <div className="text-white/60 text-xs">ALB Requests</div>
              <div className="text-white text-xl font-semibold">
                {formatNumber(blueMetrics.albRequests)}
              </div>
            </div>
            <div className="bg-black/40 rounded-lg p-4 border border-red-400/20">
              <div className="text-white/60 text-xs">5xx Errors</div>
              <div className="text-white text-xl font-semibold">
                {formatNumber(blueMetrics.albErrors)}
              </div>
            </div>
          </div>
        </div>

        {/* Green Environment Metrics */}
        <div className="space-y-4">
          <div className="text-center">
            <h4 className="text-green-400 text-xl font-bold mb-4">Green Environment</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="CPU Usage"
              value={Number.isFinite(greenMetrics.cpu) ? parseFloat(greenMetrics.cpu.toFixed(1)) : undefined}
              unit="%"
              trend={Math.random() > 0.5 ? 2 : -2}
              label="CPU"
              color="green"
            />
            <MetricCard
              title="Memory"
              value={Number.isFinite(greenMetrics.memory) ? parseFloat(greenMetrics.memory.toFixed(1)) : undefined}
              unit="%"
              trend={Math.random() > 0.5 ? 1 : -1}
              label="MEM"
              color="green"
            />
            <MetricCard
              title="Response Time"
              value={Number.isFinite(greenMetrics.responseTime) ? Math.round(greenMetrics.responseTime) : undefined}
              unit="ms"
              trend={Math.random() > 0.5 ? 3 : -5}
              label="RT"
              color="yellow"
            />
            <MetricCard
              title="Error Rate"
              value={Number.isFinite(greenMetrics.errorRate) ? parseFloat((greenMetrics.errorRate * 100).toFixed(2)) : undefined}
              unit="%"
              trend={Math.random() > 0.5 ? 0.2 : -0.6}
              label="ERR"
              color="red"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 rounded-lg p-4 border border-green-400/20">
              <div className="text-white/60 text-xs">ALB Requests</div>
              <div className="text-white text-xl font-semibold">
                {formatNumber(greenMetrics.albRequests)}
              </div>
            </div>
            <div className="bg-black/40 rounded-lg p-4 border border-red-400/20">
              <div className="text-white/60 text-xs">5xx Errors</div>
              <div className="text-white text-xl font-semibold">
                {formatNumber(greenMetrics.albErrors)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* CPU Usage Chart */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <h4 className="text-white font-bold mb-4">CPU Usage Over Time</h4>
          <div className="h-48">
            <RealtimeChart
              data={blueHistory.cpu || []}
              labels={timeLabels}
              label="Blue CPU"
              color="rgb(59, 130, 246)"
            />
          </div>
        </div>

        {/* Memory Usage Chart */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <h4 className="text-white font-bold mb-4">Memory Usage Over Time</h4>
          <div className="h-48">
            <RealtimeChart
              data={blueHistory.memory || []}
              labels={timeLabels}
              label="Blue Memory"
              color="rgb(59, 130, 246)"
            />
          </div>
        </div>
      </div>

      {/* Comparison Charts */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
        <h4 className="text-white font-bold mb-4">Blue vs Green Response Time Comparison</h4>
        <div className="h-64">
          <Line
            data={{
              labels: timeLabels,
              datasets: [
                {
                  label: 'Blue Response Time',
                  data: blueHistory.responseTime || [],
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 3
                },
                {
                  label: 'Green Response Time',
                  data: greenHistory.responseTime || [],
                  borderColor: 'rgb(74, 222, 128)',
                  backgroundColor: 'rgba(74, 222, 128, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 3
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: true,
                  labels: {
                    color: 'rgba(255, 255, 255, 0.9)',
                    font: {
                      size: 14
                    }
                  }
                },
                tooltip: {
                  mode: 'index',
                  intersect: false,
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  titleColor: '#fff',
                  bodyColor: '#fff',
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
                    color: 'rgba(255, 255, 255, 0.7)',
                    callback: function(value) {
                      return value + ' ms'
                    }
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
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
