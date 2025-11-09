class WebSocketService {
  constructor() {
    this.ws = null
    this.reconnectInterval = 3000
    this.listeners = new Map()
    this._pollTimer = null
    this._mockFallbackTimer = null
    this._pollIntervalMs = 5000
    this._url = null
    this._connectFallbackTimer = null
    this._usingMock = false
  }

  connect(url = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL) || 'ws://localhost:8080') {
    return new Promise((resolve, reject) => {
      try {
        this._url = url
        console.log('WS: connecting to', url)
        this.ws = new WebSocket(url)
        // If connection doesn't open quickly, start mock fallback
        this._startConnectFallbackTimer()

        this.ws.onopen = () => {
          console.log('✅ WS connected', this._url)
          this.emit('connected', { timestamp: new Date().toISOString() })
          // expose simple console helpers for quick manual testing
          try {
            if (typeof window !== 'undefined') {
              window.__WS = {
                send: (command, data = {}) => this.send(command, data),
                useRealData: () => this.useRealData(),
                useMockData: () => this.useMockData(),
                fetchOnce: () => this.send('fetch_metrics'),
                status: () => ({ connected: this.ws?.readyState === WebSocket.OPEN, url: this._url, usingMock: this._usingMock })
              }
              console.log('ℹ️  Console helpers available: __WS.useRealData(), __WS.useMockData(), __WS.fetchOnce()')
            }
          } catch {}
          // stop local mock fallback if any
          this._stopMockFallback()
          this._clearConnectFallbackTimer()
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
              // Also surface a readable log line in Real/APIGW mode
              try {
                const isApiGw = typeof this._url === 'string' && this._url.includes('execute-api')
                if (isApiGw) {
                  const b = blue.cpu ?? 'n/a'
                  const g = green.cpu ?? 'n/a'
                  const msg = `[METRICS] EC2 CPU Blue=${typeof b==='number'?b.toFixed(1):b}% · Green=${typeof g==='number'?g.toFixed(1):g}%`
                  this.emit('log', { type: 'log', data: { timestamp: new Date().toISOString(), type: 'info', message: msg } })
                }
              } catch {}
              return
            }

            console.log('📨 Received:', data.type, data)
            this.emit(data.type, data)
          } catch (error) {
            console.error('Failed to parse message:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('❌ WS error:', error)
          this.emit('error', error)
          // start local mock fallback so UI keeps updating
          this._startMockFallback(this._pollIntervalMs)
          this._clearConnectFallbackTimer()
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('🔌 WS disconnected')
          this.emit('disconnected', {})

          // Auto reconnect
          setTimeout(() => {
            console.log('🔄 Attempting to reconnect...')
            this.connect(url)
          }, this.reconnectInterval)
          // keep UI alive with local mock
          this._startMockFallback(this._pollIntervalMs)
          this._clearConnectFallbackTimer()
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
    this._stopMockFallback()
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
    this._pollIntervalMs = intervalMs
    // Kick off immediately once
    this._requestMetricsOnce()
    this._pollTimer = setInterval(() => {
      this._requestMetricsOnce()
    }, intervalMs)
    // If not connected, start local mock fallback immediately
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this._startMockFallback(intervalMs)
    }
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

  _startMockFallback(intervalMs = 5000) {
    if (this._mockFallbackTimer) return
    this._usingMock = true
    console.log('🧪 WS not connected → using mock metrics fallback')
    const genBlue = () => {
      const cpu = 35 + Math.random() * 20 // 35~55%
      const responseTime = 180 + Math.random() * 60 // ms
      return { cpu, memory: null, responseTime, errorRate: 0.05, timestamp: new Date().toISOString() }
    }
    const genGreenFromBlue = (blue) => {
      // Slightly different from blue to simulate 2c AZ
      const delta = (Math.random() - 0.5) * 6 // -3% ~ +3%
      const cpu = Math.max(0, Math.min(100, blue.cpu + delta))
      const responseTime = Math.max(50, blue.responseTime + (Math.random() - 0.5) * 20)
      return { cpu, memory: null, responseTime, errorRate: 0.04, timestamp: new Date().toISOString() }
    }
    const emitOnce = () => {
      const blue = genBlue()
      const green = genGreenFromBlue(blue)
      const payload = { type: 'metrics', data: { blue, green } }
      this.emit('metrics', payload)
    }
    emitOnce()
    this._mockFallbackTimer = setInterval(emitOnce, intervalMs)
  }

  _stopMockFallback() {
    if (this._mockFallbackTimer) {
      clearInterval(this._mockFallbackTimer)
      this._mockFallbackTimer = null
    }
    if (this._usingMock) {
      this._usingMock = false
      console.log('🔁 Switched to live data (mock fallback stopped)')
    }
  }

  _startConnectFallbackTimer(delayMs = 1500) {
    this._clearConnectFallbackTimer()
    this._connectFallbackTimer = setTimeout(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this._startMockFallback(this._pollIntervalMs)
      }
    }, delayMs)
  }

  _clearConnectFallbackTimer() {
    if (this._connectFallbackTimer) {
      clearTimeout(this._connectFallbackTimer)
      this._connectFallbackTimer = null
    }
  }
}

export default new WebSocketService()
