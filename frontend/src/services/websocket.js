class WebSocketService {
  constructor() {
    this.ws = null
    this.reconnectInterval = 3000
    this.listeners = new Map()
  }

  connect(url = 'ws://localhost:8080') {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected')
          this.emit('connected', { timestamp: new Date().toISOString() })
          resolve(this.ws)
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('📨 Received:', data.type, data)
            this.emit(data.type, data)
          } catch (error) {
            console.error('Failed to parse message:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error)
          this.emit('error', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('🔌 WebSocket disconnected')
          this.emit('disconnected', {})

          // Auto reconnect
          setTimeout(() => {
            console.log('🔄 Attempting to reconnect...')
            this.connect(url)
          }, this.reconnectInterval)
        }
      } catch (error) {
        console.error('Failed to create WebSocket:', error)
        reject(error)
      }
    })
  }

  send(command, data = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ command, ...data }))
      console.log('📤 Sent:', command, data)
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data))
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  // Convenience methods
  startMonitoring() {
    this.send('start_monitoring')
  }

  stopMonitoring() {
    this.send('stop_monitoring')
  }

  runTerraformPlan() {
    this.send('terraform_plan')
  }

  runTerraformApply() {
    this.send('terraform_apply')
  }

  getXRayGraph() {
    this.send('get_xray_graph')
  }

  getLogs() {
    this.send('get_logs')
  }

  useRealData() {
    this.send('use_real_data')
  }

  useMockData() {
    this.send('use_mock_data')
  }
}

export default new WebSocketService()
