import { useEffect, useRef } from 'react'
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

export default function MetricsChart({ blueData, greenData, label = 'CPU (%)' }) {
  const chartRef = useRef(null)

  const data = {
    labels: Array.from({ length: 30 }, (_, i) => `${i}s`),
    datasets: [
      {
        label: 'Blue',
        data: blueData,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2
      },
      {
        label: 'Green',
        data: greenData,
        borderColor: '#4ADE80',
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          maxTicksLimit: 10
        }
      },
      y: {
        display: true,
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: 'white',
          usePointStyle: true
        }
      },
      title: {
        display: true,
        text: label,
        color: 'white',
        font: {
          size: 14,
          weight: 'bold'
        }
      }
    }
  }

  return (
    <div style={{ width: '100%', height: '200px' }}>
      <Line ref={chartRef} data={data} options={options} />
    </div>
  )
}
