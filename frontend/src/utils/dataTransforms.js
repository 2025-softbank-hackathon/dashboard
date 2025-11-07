const toFiniteNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
}

const ensureMilliseconds = (value) => {
  if (!Number.isFinite(value)) return undefined

  // CloudWatch metrics typically arrive as seconds (0.xx) while
  // our UI expects milliseconds. If the value looks like seconds
  // convert it, otherwise assume it's already in ms.
  if (value > 0 && value < 10) {
    return value * 1000
  }

  return value
}

function normalizeEnvironmentObject(metrics) {
  if (!metrics || typeof metrics !== 'object') {
    return null
  }

  const cpu = toFiniteNumber(metrics.cpu ?? metrics.CPU ?? metrics.cpuUtilization)
  const memory = toFiniteNumber(metrics.memory ?? metrics.Memory ?? metrics.memoryUtilization)
  const responseTime = ensureMilliseconds(
    toFiniteNumber(
      metrics.responseTime ??
        metrics.response_time ??
        metrics.latencyMs ??
        metrics.latency_ms ??
        metrics.latency ??
        metrics.averageResponseTimeMs ??
        metrics.averageResponseTime
    )
  )
  const requests = toFiniteNumber(
    metrics.albRequests ??
      metrics.requests ??
      metrics.requestCount ??
      metrics.totalRequests
  )
  const errors = toFiniteNumber(
    metrics.albErrors ??
      metrics.errors ??
      metrics.errorCount ??
      metrics['5xxErrors']
  )
  const errorRateValue = toFiniteNumber(metrics.errorRate ?? metrics.error_rate)

  const errorRate = Number.isFinite(errorRateValue)
    ? errorRateValue
    : Number.isFinite(requests) && requests > 0 && Number.isFinite(errors)
      ? errors / requests
      : undefined

  return {
    cpu,
    memory,
    responseTime,
    albRequests: requests,
    albErrors: errors,
    errorRate,
  }
}

export function transformCloudWatchMetrics(rawMetrics) {
  if (!rawMetrics || typeof rawMetrics !== 'object') {
    return {
      blue: null,
      green: null,
    }
  }

  const metricsPayload = rawMetrics.metrics && typeof rawMetrics.metrics === 'object'
    ? rawMetrics.metrics
    : rawMetrics

  const hasEnvironmentObjects =
    typeof metricsPayload.blue === 'object' || typeof metricsPayload.green === 'object'

  const hasFlatKeys = Object.keys(metricsPayload).some((key) =>
    key.startsWith('ECS_') || key.startsWith('ALB_')
  )

  const buildEnvironmentMetricsFromFlat = (environmentLabel) => {
    const suffix = environmentLabel.charAt(0).toUpperCase() + environmentLabel.slice(1)

    const cpu = toFiniteNumber(metricsPayload[`ECS_CPU_${suffix}`])
    const memory = toFiniteNumber(metricsPayload[`ECS_Memory_${suffix}`])
    const responseSeconds = toFiniteNumber(metricsPayload[`ALB_ResponseTime_${suffix}`])
    const requests = toFiniteNumber(metricsPayload[`ALB_Requests_${suffix}`])
    const errors = toFiniteNumber(metricsPayload[`ALB_Errors_5xx_${suffix}`])

    const responseTime = ensureMilliseconds(responseSeconds)

    const errorRate = Number.isFinite(requests) && requests > 0 && Number.isFinite(errors)
      ? errors / requests
      : undefined

    return {
      cpu,
      memory,
      responseTime,
      albRequests: requests,
      albErrors: errors,
      errorRate,
    }
  }

  if (hasEnvironmentObjects) {
    return {
      blue: normalizeEnvironmentObject(metricsPayload.blue),
      green: normalizeEnvironmentObject(metricsPayload.green),
    }
  }

  if (hasFlatKeys) {
    return {
      blue: buildEnvironmentMetricsFromFlat('blue'),
      green: buildEnvironmentMetricsFromFlat('green'),
    }
  }

  // Fallback for generic payloads – attempt to treat entire object as the blue environment
  const normalized = normalizeEnvironmentObject(metricsPayload)

  return {
    blue: normalized,
    green: null,
  }
}

export function transformXRayGraph(rawServices = []) {
  const services = Array.isArray(rawServices?.services) ? rawServices.services : rawServices

  if (!Array.isArray(services)) {
    return []
  }

  return services.map((service) => {
    const summary = service.SummaryStatistics || service.summaryStatistics || service.metrics || {}
    const errorStatistics = summary.ErrorStatistics || summary.errorStatistics || {}
    const faultStatistics = summary.FaultStatistics || summary.faultStatistics || {}
    const throttleStatistics = summary.ThrottleStatistics || summary.throttleStatistics || {}
    const okCount = summary.OkayCount ?? summary.okayCount

    const totalCount = toFiniteNumber(summary.TotalCount ?? summary.totalCount ?? okCount ?? service.requestCount)
    const totalResponseTime = toFiniteNumber(summary.TotalResponseTime ?? summary.totalResponseTime)

    const averageResponse = toFiniteNumber(
      summary.AverageResponseTime ??
        summary.averageResponseTime ??
        service.averageResponseTime ??
        service.averageResponseTimeMs ??
        service.responseTime
    )

    const computedAverage = Number.isFinite(totalResponseTime) && Number.isFinite(totalCount) && totalCount > 0
      ? totalResponseTime / totalCount
      : undefined

    const averageResponseTime = ensureMilliseconds(
      Number.isFinite(averageResponse) ? averageResponse : computedAverage
    )

    const errorCount = toFiniteNumber(
      errorStatistics.TotalCount ??
        errorStatistics.totalCount ??
        service.errorCount ??
        service.errorRate
    )
    const faultCount = toFiniteNumber(faultStatistics.TotalCount ?? faultStatistics.totalCount ?? service.faultCount)
    const throttleCount = toFiniteNumber(
      throttleStatistics.TotalCount ?? throttleStatistics.totalCount ?? service.throttleCount
    )

    const rawEdges = Array.isArray(service.Edges)
      ? service.Edges
      : Array.isArray(service.edges)
        ? service.edges
        : Array.isArray(service.downstreamNodes)
          ? service.downstreamNodes
          : []

    const edges = rawEdges.map((edge) => {
      const edgeSummary = edge.SummaryStatistics || edge.summaryStatistics || edge.metrics || {}
      const edgeErrors = edgeSummary.ErrorStatistics || edgeSummary.errorStatistics || {}

      const averageEdgeResponse = ensureMilliseconds(
        toFiniteNumber(
          edgeSummary.AverageResponseTime ??
            edgeSummary.averageResponseTime ??
            edge.averageResponseTime ??
            edge.averageResponseTimeMs
        )
      )

      return {
        targetId:
          edge.ReferenceId ||
          edge.referenceId ||
          edge.TargetId ||
          edge.targetId ||
          edge.id ||
          edge.To ||
          edge.to,
        averageResponseTimeMs: averageEdgeResponse,
        requestCount: toFiniteNumber(
          edgeSummary.TotalCount ?? edgeSummary.totalCount ?? edge.requestCount
        ),
        errorCount: toFiniteNumber(edgeErrors.TotalCount ?? edgeErrors.totalCount ?? edge.errorCount),
      }
    }).filter((edge) => edge.targetId)

    return {
      id: service.Id || service.id || service.Name || service.name,
      name: service.Name || service.name || 'Unknown Service',
      type: service.Type || service.type || service.EntityType || 'service',
      edges,
      averageResponseTimeMs: averageResponseTime,
      requestCount: totalCount,
      errorCount,
      faultCount,
      throttleCount,
    }
  })
}
