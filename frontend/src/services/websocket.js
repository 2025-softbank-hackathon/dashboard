const DEFAULT_REMOTE_ENDPOINT = 'wss://rysusu6e4a.execute-api.ap-northeast-2.amazonaws.com/dev'

class WebSocketService {
  constructor() {
    this.ws = null
    this.url = null
    this.reconnectInterval = 5000
    this.listeners = new Map()
    this.manualClose = false
  }

  getDefaultUrl() {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WEBSOCKET_URL) {
      return import.meta.env.VITE_WEBSOCKET_URL
    }
    return DEFAULT_REMOTE_ENDPOINT
  }

  connect(url = this.getDefaultUrl()) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve(this.ws)
    }

    this.url = url
    this.manualClose = false

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected:', url)
          this.emit('connected', { timestamp: new Date().toISOString(), url })
          resolve(this.ws)
        }

        this.ws.onmessage = (event) => {
          if (!event?.data) return

          try {
            const payload = JSON.parse(event.data)
            this.emit('raw_message', payload)

            if (payload.type) {
              this.emit(payload.type, payload)
            }

            const messageType = payload.type || ''
            const data = payload.data ?? payload.payload ?? null

            const metricsPayload =
              payload.cloudwatch_metrics ??
              data?.cloudwatch_metrics ??
              (messageType === 'metrics' ? data ?? payload.metrics ?? payload : null)

            if (metricsPayload) {
              this.emit('cloudwatch_metrics', {
                metrics: metricsPayload,
                timestamp: payload.timestamp ?? data?.timestamp,
              })
            }

            const xrayPayload =
              payload.xray_service_graph ??
              data?.xray_service_graph ??
              data?.services ??
              (messageType.startsWith('xray') ? data : null)

            if (xrayPayload) {
              this.emit('xray_service_graph', { data: xrayPayload, timestamp: payload.timestamp ?? data?.timestamp })
            }

            if (payload.timestamp) {
              this.emit('timestamp', payload.timestamp)
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
            this.emit('parse_error', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error)
          this.emit('error', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('🔌 WebSocket disconnected')
          this.emit('disconnected', { url })

          if (!this.manualClose) {
            setTimeout(() => {
              console.log('🔄 Attempting to reconnect...')
              this.connect(this.url)
            }, this.reconnectInterval)
          }
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
    if (!this.listeners.has(event)) return

    const callbacks = this.listeners.get(event)
    const nextCallbacks = callbacks.filter((cb) => cb !== callback)

    if (nextCallbacks.length > 0) {
      this.listeners.set(event, nextCallbacks)
    } else {
      this.listeners.delete(event)
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event)
    if (!callbacks) return

    callbacks.forEach((callback) => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Error executing listener for ${event}:`, error)
      }
    })
  }

  disconnect() {
    if (this.ws) {
      this.manualClose = true
      this.ws.close()
      this.ws = null
    }
  }

  // Legacy helper methods retained for backwards compatibility
  startMonitoring() {
    this.send('start_monitoring')
  }

  stopMonitoring() {
    this.send('stop_monitoring')
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
