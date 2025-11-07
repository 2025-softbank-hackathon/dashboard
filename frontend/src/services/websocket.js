class WebSocketService {
  constructor() {
    this.ws = null
    this.reconnectInterval = 3000
    this.listeners = new Map()
    this._pollTimer = null
    this._url = null
  }

  connect(url = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL) || 'ws://localhost:8080') {
    return new Promise((resolve, reject) => {
      try {
        this._url = url
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected')
          this.emit('connected', { timestamp: new Date().toISOString() })
          // expose simple console helpers for quick manual testing
          try {
            if (typeof window !== 'undefined') {
              window.__WS = {
                send: (command, data = {}) => this.send(command, data),
                useRealData: () => this.useRealData(),
                useMockData: () => this.useMockData(),
                fetchOnce: () => this.send('fetch_metrics')
              }
              console.log('ℹ️  Console helpers available: __WS.useRealData(), __WS.useMockData(), __WS.fetchOnce()')
            }
          } catch {}
          resolve(this.ws)
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            // Adapt to formats:
            // 1) Local server: { type: 'metrics'|'log'|..., data: {...} }
            // 2) API GW (metrics): { cloudwatch_metrics: {...}, timestamp: ... }
            // 3) API GW (CI logs): { type: 'log_stream', source, messages: [...] }

            // Normalize CI/CD log stream
            if (data && data.type === 'log_stream' && Array.isArray(data.messages)) {
              data.messages.filter(Boolean).forEach((line) => {
                const payload = { type: 'log', data: { timestamp: new Date().toISOString(), type: 'info', message: String(line) } }
                this.emit('log', payload)
              })
              return
            }

            if (data && data.cloudwatch_metrics) {
              const m = data.cloudwatch_metrics
              const blue = {
                cpu: (m.EC2_CPU_Blue ?? m.ECS_CPU_Blue) ?? null,
                memory: (m.EC2_Memory_Blue ?? m.ECS_Memory_Blue) ?? null,
                responseTime: typeof m.ALB_ResponseTime_Blue === 'number' ? m.ALB_ResponseTime_Blue * 1000 : null,
                errorRate: null,
                traffic: m.ALB_Requests_Blue ?? null,
                timestamp: data.timestamp
              }
              const green = {
                cpu: (m.EC2_CPU_Green ?? m.ECS_CPU_Green) ?? null,
                memory: (m.EC2_Memory_Green ?? m.ECS_Memory_Green) ?? null,
                responseTime: typeof m.ALB_ResponseTime_Green === 'number' ? m.ALB_ResponseTime_Green * 1000 : null,
                errorRate: null,
                traffic: m.ALB_Requests_Green ?? null,
                timestamp: data.timestamp
              }
              const adapted = { type: 'metrics', data: { blue, green } }
              console.log('📨 Received(APIGW): metrics', adapted)
              this.emit('metrics', adapted)
              return
            }

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
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
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

  // Client-driven polling every `intervalMs` to request fresh metrics
  startPolling(intervalMs = 5000) {
    if (this._pollTimer) clearInterval(this._pollTimer)
    // Kick off immediately once
    this._requestMetricsOnce()
    this._pollTimer = setInterval(() => {
      this._requestMetricsOnce()
    }, intervalMs)
  }

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
  }

  _requestMetricsOnce() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const isApiGw = typeof this._url === 'string' && this._url.includes('execute-api')
    if (isApiGw) {
      try {
        this.ws.send('.')
      } catch (e) {
        console.warn('Failed to send dot message:', e)
      }
    } else {
      this.send('fetch_metrics')
    }
  }
}

export default new WebSocketService()
