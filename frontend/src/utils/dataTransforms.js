export function transformCloudWatchMetrics(rawMetrics) {
  if (!rawMetrics || typeof rawMetrics !== 'object') {
    return {
      blue: null,
      green: null,
    }
  }

  const buildEnvironmentMetrics = (environmentLabel) => {
    const suffix = environmentLabel.charAt(0).toUpperCase() + environmentLabel.slice(1)

    const cpu = Number(rawMetrics[`ECS_CPU_${suffix}`])
    const memory = Number(rawMetrics[`ECS_Memory_${suffix}`])
    const responseSeconds = Number(rawMetrics[`ALB_ResponseTime_${suffix}`])
    const requests = Number(rawMetrics[`ALB_Requests_${suffix}`])
    const errors = Number(rawMetrics[`ALB_Errors_5xx_${suffix}`])

    const responseTime = Number.isFinite(responseSeconds) ? responseSeconds * 1000 : undefined
    const errorRate = Number.isFinite(requests) && requests > 0 && Number.isFinite(errors)
      ? errors / requests
      : 0

    return {
      cpu: Number.isFinite(cpu) ? cpu : undefined,
      memory: Number.isFinite(memory) ? memory : undefined,
      responseTime: Number.isFinite(responseTime) ? responseTime : undefined,
      albRequests: Number.isFinite(requests) ? requests : undefined,
      albErrors: Number.isFinite(errors) ? errors : undefined,
      errorRate,
    }
  }

  return {
    blue: buildEnvironmentMetrics('blue'),
    green: buildEnvironmentMetrics('green'),
  }
}

export function transformXRayGraph(services = []) {
  if (!Array.isArray(services)) {
    return []
  }

  return services.map((service) => {
    const summary = service.SummaryStatistics || service.summaryStatistics || {}
    const errorStatistics = summary.ErrorStatistics || summary.errorStatistics || {}
    const faultStatistics = summary.FaultStatistics || summary.faultStatistics || {}
    const throttleStatistics = summary.ThrottleStatistics || summary.throttleStatistics || {}
    const okCount = summary.OkayCount ?? summary.okayCount

    const totalCount = summary.TotalCount ?? summary.totalCount ?? okCount ?? 0
    const totalResponseTime = summary.TotalResponseTime ?? summary.totalResponseTime

    const averageResponse = summary.AverageResponseTime ?? summary.averageResponseTime
    const computedAverage = Number.isFinite(totalResponseTime) && Number.isFinite(totalCount) && totalCount > 0
      ? totalResponseTime / totalCount
      : undefined

    const averageResponseTime = Number.isFinite(averageResponse) ? averageResponse : computedAverage
    const errorCount = errorStatistics.TotalCount ?? errorStatistics.totalCount ?? 0
    const faultCount = faultStatistics.TotalCount ?? faultStatistics.totalCount ?? 0
    const throttleCount = throttleStatistics.TotalCount ?? throttleStatistics.totalCount ?? 0

    const edges = Array.isArray(service.Edges)
      ? service.Edges.map((edge) => {
          const edgeSummary = edge.SummaryStatistics || edge.summaryStatistics || {}
          const edgeErrors = edgeSummary.ErrorStatistics || edgeSummary.errorStatistics || {}

          return {
            targetId: edge.ReferenceId || edge.id || edge.referenceId,
            averageResponseTimeMs: Number.isFinite(edgeSummary.AverageResponseTime)
              ? edgeSummary.AverageResponseTime * 1000
              : undefined,
            requestCount: Number.isFinite(edgeSummary.TotalCount) ? edgeSummary.TotalCount : undefined,
            errorCount: Number.isFinite(edgeErrors.TotalCount) ? edgeErrors.TotalCount : undefined,
          }
        })
      : []

    return {
      id: service.Id || service.id,
      name: service.Name || service.name || 'Unknown Service',
      type: service.Type || service.type || 'service',
      edges,
      averageResponseTimeMs: Number.isFinite(averageResponseTime) ? averageResponseTime * 1000 : undefined,
      requestCount: Number.isFinite(totalCount) ? totalCount : undefined,
      errorCount: Number.isFinite(errorCount) ? errorCount : undefined,
      faultCount: Number.isFinite(faultCount) ? faultCount : undefined,
      throttleCount: Number.isFinite(throttleCount) ? throttleCount : undefined,
    }
  })
}
