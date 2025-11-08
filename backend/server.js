#!/usr/bin/env node

/**
 * Delightful Deployment - WebSocket Server
 * 실시간 AWS 데이터(CloudWatch, X-Ray)를 프론트엔드로 전송
 */

const WebSocket = require('ws');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// .env 로드(있으면)
try {
  require('dotenv').config();
} catch (_) {}

const PORT = 8080;
const REGION = process.env.AWS_REGION || 'ap-northeast-2';
// EC2 인스턴스 기반(권장)
const EC2_INSTANCE_ID_BLUE = process.env.EC2_INSTANCE_ID_BLUE || '';
const EC2_INSTANCE_ID_GREEN = process.env.EC2_INSTANCE_ID_GREEN || '';

// (이전 호환) ECS 서비스 기반 – 더 이상 사용하지 않음
const ECS_CLUSTER_NAME = process.env.ECS_CLUSTER_NAME || 'softbank-demo-cluster';
const BLUE_SERVICE_NAME = process.env.BLUE_SERVICE_NAME || 'demo-blue-service';
const GREEN_SERVICE_NAME = process.env.GREEN_SERVICE_NAME || 'demo-green-service';
const CW_LOG_GROUP = process.env.CW_LOG_GROUP || '/ecs/softbank-demo';

// WebSocket 서버 생성
const wss = new WebSocket.Server({ port: PORT });

console.log(`[START] WebSocket Server started on ws://localhost:${PORT}`);
console.log('[ENV] REGION=%s, CLUSTER=%s, BLUE=%s, GREEN=%s, LOG_GROUP=%s', REGION, ECS_CLUSTER_NAME, BLUE_SERVICE_NAME, GREEN_SERVICE_NAME, CW_LOG_GROUP);

// ========================================
// Utilities
// ========================================

async function writeTempJson(prefix, obj) {
  const file = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  await fs.writeFile(file, JSON.stringify(obj), 'utf8');
  return file;
}

// ========================================
// AWS CLI Helper Functions
// ========================================

/**
 * CloudWatch Metrics 가져오기 (EC2 CPU)
 */
async function getEC2Metrics(instanceId) {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  const startTime = fiveMinutesAgo.toISOString();
  const endTime = now.toISOString();

  const queryObj = [
    {
      Id: 'cpu',
      MetricStat: {
        Metric: {
          Namespace: 'AWS/EC2',
          MetricName: 'CPUUtilization',
          Dimensions: [
            { Name: 'InstanceId', Value: instanceId }
          ]
        },
        Period: 60,
        Stat: 'Average'
      }
    }
  ];

  let queryFile;
  try {
    // Windows PowerShell 따옴표 이슈 회피: file:// 로 JSON 전달
    queryFile = await writeTempJson('cw-mdq', queryObj);
    const { stdout } = await execPromise(
      `aws cloudwatch get-metric-data \
        --metric-data-queries file://${queryFile} \
        --start-time "${startTime}" \
        --end-time "${endTime}" \
        --region ${REGION} \
        --output json`
    );

    const data = JSON.parse(stdout);

    const cpuData = (data.MetricDataResults || []).find((m) => m.Id === 'cpu');

    const latest = (arr) => (Array.isArray(arr) && arr.length ? arr[arr.length - 1] : null);

    return {
      cpu: latest(cpuData?.Values) ?? null,
      memory: null,
      timestamp: now.toISOString(),
    };
  } catch (error) {
    console.error(`[ERROR] Error fetching metrics for ${serviceName}:`, error.message);
    return null;
  } finally {
    if (queryFile) {
      try { await fs.unlink(queryFile); } catch (_) {}
    }
  }
}

/**
 * CloudWatch Logs 가져오기
 */
async function getCloudWatchLogs(logGroupName, limit = 20) {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

  try {
    const { stdout } = await execPromise(
      `aws logs filter-log-events \
        --log-group-name "${logGroupName}" \
        --start-time ${fiveMinutesAgo} \
        --limit ${limit} \
        --region ${REGION} \
        --output json`
    );

    const data = JSON.parse(stdout);

    return (data.events || []).map((event) => ({
      timestamp: new Date(event.timestamp).toISOString(),
      message: event.message,
    }));
  } catch (error) {
    console.error(`[ERROR] Error fetching logs from ${logGroupName}:`, error.message);
    return [];
  }
}

/**
 * X-Ray Service Graph 가져오기 및 파싱
 */
async function getXRayServiceGraph() {
  const now = new Date();
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

  const startTime = Math.floor(thirtyMinutesAgo.getTime() / 1000);
  const endTime = Math.floor(now.getTime() / 1000);

  try {
    const { stdout } = await execPromise(
      `aws xray get-service-graph \
        --start-time ${startTime} \
        --end-time ${endTime} \
        --region ${REGION} \
        --output json`
    );

    const data = JSON.parse(stdout);

    const services = (data.Services || []).map((service) => {
      const summaryStats = service.SummaryStatistics || {};
      const avgResponseTime = summaryStats.TotalResponseTime
        ? Math.round((summaryStats.TotalResponseTime / summaryStats.TotalCount) * 1000)
        : 0;

      return {
        name: service.Name || 'Unknown',
        type: service.Type || 'service',
        responseTime: avgResponseTime,
        errorRate: summaryStats.ErrorStatistics?.TotalCount || 0,
        requestCount: summaryStats.TotalCount || 0,
        timestamp: new Date().toISOString(),
      };
    });

    console.log(`[INFO] X-Ray fetched ${services.length} services`);
    return services;
  } catch (error) {
    console.error('[ERROR] Error fetching X-Ray service graph:', error.message);
    return null;
  }
}

/**
 * X-Ray 서비스 맵을 아키텍처에 맞게 매핑
 */
function mapXRayToArchitecture(xrayServices) {
  if (!xrayServices || xrayServices.length === 0) {
    return null;
  }

  const serviceMap = {
    'demo-alb': { name: 'ALB', position: [0, 3, 5] },
    'demo-blue-ecs-az1': { name: 'Blue-AZ1', position: [-4, 2, 2] },
    'demo-blue-ecs-az2': { name: 'Blue-AZ2', position: [-4, 2, -2] },
    'demo-green-ecs-az1': { name: 'Green-AZ1', position: [4, 2, 2] },
    'demo-green-ecs-az2': { name: 'Green-AZ2', position: [4, 2, -2] },
    dynamodb: { name: 'DynamoDB', position: [0, 1, -4] },
    'elasticache-redis-az1': { name: 'Redis-AZ1', position: [-2, 0.5, 0] },
    'elasticache-redis-az2': { name: 'Redis-AZ2', position: [2, 0.5, 0] },
  };

  return xrayServices
    .map((service) => {
      const mappedService = Object.entries(serviceMap).find(([key]) =>
        (service.name || '').toLowerCase().includes(key.toLowerCase())
      );

      if (mappedService) {
        return {
          ...mappedService[1],
          responseTime: service.responseTime,
          errorRate: service.errorRate,
          requestCount: service.requestCount,
        };
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * X-Ray Trace Summaries 가져오기
 */
async function getXRayTraceSummaries() {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  const startTime = Math.floor(fiveMinutesAgo.getTime() / 1000);
  const endTime = Math.floor(now.getTime() / 1000);

  try {
    const { stdout } = await execPromise(
      `aws xray get-trace-summaries \
        --start-time ${startTime} \
        --end-time ${endTime} \
        --region ${REGION} \
        --output json`
    );

    const data = JSON.parse(stdout);
    return data.TraceSummaries || [];
  } catch (error) {
    console.error('[ERROR] Error fetching X-Ray traces:', error.message);
    return [];
  }
}

/**
 * CodePipeline 실행 상태 가져오기
 */
async function getCodePipelineStatus(pipelineName = 'softbank-demo-pipeline') {
  try {
    const { stdout } = await execPromise(
      `aws codepipeline get-pipeline-state \
        --name ${pipelineName} \
        --region ${REGION} \
        --output json`
    );

    const data = JSON.parse(stdout);
    return {
      pipelineName: data.pipelineName,
      stages: data.stageStates || [],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[ERROR] Error fetching CodePipeline status:', error.message);
    return null;
  }
}

/**
 * CodeBuild 빌드 상태 가져오기 (Windows 호환)
 */
async function getCodeBuildStatus(projectName = 'softbank-demo-build') {
  try {
    // 1) 최신 빌드 ID 조회
    const { stdout: listStdout } = await execPromise(
      `aws codebuild list-builds-for-project \
        --project-name ${projectName} \
        --max-items 1 \
        --region ${REGION} \
        --output json`
    );
    const listData = JSON.parse(listStdout || '{}');
    const latestId = (listData.ids && listData.ids[0]) || null;
    if (!latestId) return null;

    // 2) 빌드 상세 조회
    const { stdout } = await execPromise(
      `aws codebuild batch-get-builds \
        --ids ${latestId} \
        --region ${REGION} \
        --output json`
    );

    const data = JSON.parse(stdout);
    const build = data.builds?.[0];

    return build
      ? {
          id: build.id,
          status: build.buildStatus,
          phase: build.currentPhase,
          startTime: build.startTime,
          endTime: build.endTime,
          logs: build.logs,
          timestamp: new Date().toISOString(),
        }
      : null;
  } catch (error) {
    console.error('[ERROR] Error fetching CodeBuild status:', error.message);
    return null;
  }
}

/**
 * CodeDeploy 배포 상태 가져오기
 */
async function getCodeDeployStatus(deploymentGroupName = 'softbank-demo-dg', applicationName = 'softbank-demo-app') {
  try {
    const { stdout: listStdout } = await execPromise(
      `aws deploy list-deployments \
        --application-name ${applicationName} \
        --deployment-group-name ${deploymentGroupName} \
        --max-items 1 \
        --region ${REGION} \
        --output json`
    );

    const listData = JSON.parse(listStdout);
    const deploymentId = listData.deployments?.[0];
    if (!deploymentId) return null;

    const { stdout: detailStdout } = await execPromise(
      `aws deploy get-deployment \
        --deployment-id ${deploymentId} \
        --region ${REGION} \
        --output json`
    );

    const data = JSON.parse(detailStdout);
    const deployment = data.deploymentInfo;

    return {
      id: deployment.deploymentId,
      status: deployment.status,
      createTime: deployment.createTime,
      completeTime: deployment.completeTime,
      targetInstances: deployment.targetInstances,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[ERROR] Error fetching CodeDeploy status:', error.message);
    return null;
  }
}

/**
 * ALB Target Group 헬스 상태 가져오기
 */
async function getALBTargetHealth(targetGroupArn) {
  try {
    const { stdout } = await execPromise(
      `aws elbv2 describe-target-health \
        --target-group-arn ${targetGroupArn} \
        --region ${REGION} \
        --output json`
    );

    const data = JSON.parse(stdout);
    return {
      targets: data.TargetHealthDescriptions || [],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[ERROR] Error fetching ALB target health:', error.message);
    return null;
  }
}

// ========================================
// Mock Data (for demo when AWS data unavailable)
// ========================================

function generateMockMetrics(serviceName) {
  const isGreen = serviceName.includes('green');
  return {
    cpu: isGreen ? Math.random() * 30 + 15 : Math.random() * 30 + 40,
    memory: isGreen ? Math.random() * 20 + 40 : Math.random() * 25 + 55,
    responseTime: isGreen ? Math.random() * 50 + 150 : Math.random() * 80 + 200,
    errorRate: isGreen ? Math.random() * 0.1 : Math.random() * 0.3,
    timestamp: new Date().toISOString(),
  };
}

function generateMockLogs() {
  const logTemplates = [
    { type: 'info', message: 'Request processed successfully' },
    { type: 'info', message: 'Health check passed' },
    { type: 'success', message: 'Database connection established' },
    { type: 'warning', message: 'High memory usage detected' },
    { type: 'info', message: 'Cache hit ratio: 87%' },
  ];

  const randomLog = logTemplates[Math.floor(Math.random() * logTemplates.length)];
  return {
    timestamp: new Date().toISOString(),
    type: randomLog.type,
    message: `[${randomLog.type.toUpperCase()}] ${randomLog.message}`,
  };
}

// ========================================
// WebSocket Connection Handler
// ========================================

wss.on('connection', (ws) => {
  console.log('[SUCCESS] Client connected');

  let intervalId = null;
  let useMockData = true; // AWS 데이터가 없을 때 Mock 데이터 사용

  // 클라이언트로부터 메시지 수신
  ws.on('message', async (message) => {
    let data = {};
    try { data = JSON.parse(message); } catch (_) { data = { command: String(message) } }

    switch (data.command) {
      case 'start_monitoring':
        console.log('[INFO] Starting real-time monitoring...');

        intervalId = setInterval(async () => {
          let blueMetrics, greenMetrics;

          if (useMockData) {
            blueMetrics = generateMockMetrics('blue');
            greenMetrics = generateMockMetrics('green');
          } else {
            // EC2 인스턴스 기준 수집
            blueMetrics = EC2_INSTANCE_ID_BLUE ? await getEC2Metrics(EC2_INSTANCE_ID_BLUE) : null;
            greenMetrics = EC2_INSTANCE_ID_GREEN ? await getEC2Metrics(EC2_INSTANCE_ID_GREEN) : null;
          }

          ws.send(
            JSON.stringify({
              type: 'metrics',
              data: { blue: blueMetrics, green: greenMetrics },
            })
          );

          if (useMockData) {
            ws.send(
              JSON.stringify({
                type: 'log',
                data: generateMockLogs(),
              })
            );
          }
        }, 2000);

        // X-Ray 서비스 맵은 10초마다 갱신
        const xrayInterval = setInterval(async () => {
          if (!useMockData) {
            const xrayServices = await getXRayServiceGraph();
            const mappedServices = mapXRayToArchitecture(xrayServices);

            if (mappedServices) {
              ws.send(
                JSON.stringify({
                  type: 'xray_service_map',
                  data: mappedServices,
                })
              );
            }
          }
        }, 10000);

        ws.on('close', () => { try { clearInterval(xrayInterval); } catch (_) {} });
        break;

      // 1회성 메트릭 수집 후 전체 브로드캐스트
      case 'fetch_metrics':
        try {
          let blueMetrics, greenMetrics;
          if (useMockData) {
            blueMetrics = generateMockMetrics('blue');
            greenMetrics = generateMockMetrics('green');
          } else {
            blueMetrics = EC2_INSTANCE_ID_BLUE ? await getEC2Metrics(EC2_INSTANCE_ID_BLUE) : null;
            greenMetrics = EC2_INSTANCE_ID_GREEN ? await getEC2Metrics(EC2_INSTANCE_ID_GREEN) : null;
          }

          const payload = JSON.stringify({ type: 'metrics', data: { blue: blueMetrics, green: greenMetrics } });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) client.send(payload);
          });

          if (useMockData) {
            const logPayload = JSON.stringify({ type: 'log', data: generateMockLogs() });
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) client.send(logPayload);
            });
          }
        } catch (e) {
          console.error('[ERROR] fetch_metrics failed:', e.message);
        }
        break;

      case 'stop_monitoring':
        console.log('[STOP] Stopping monitoring...');
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        break;

      case 'get_pipeline_status':
        ws.send(
          JSON.stringify({ type: 'pipeline_status', data: await getCodePipelineStatus() })
        );
        break;

      case 'get_codebuild_status':
        ws.send(
          JSON.stringify({ type: 'codebuild_status', data: await getCodeBuildStatus() })
        );
        break;

      case 'get_codedeploy_status':
        ws.send(
          JSON.stringify({ type: 'codedeploy_status', data: await getCodeDeployStatus() })
        );
        break;

      case 'get_alb_health':
        if (data.targetGroupArn) {
          ws.send(
            JSON.stringify({ type: 'alb_health', data: await getALBTargetHealth(data.targetGroupArn) })
          );
        }
        break;

      case 'get_xray_graph':
        ws.send(
          JSON.stringify({ type: 'xray_service_graph', data: await getXRayServiceGraph() })
        );
        break;

      case 'get_logs':
        ws.send(
          JSON.stringify({ type: 'logs', data: useMockData ? [generateMockLogs(), generateMockLogs(), generateMockLogs()] : await getCloudWatchLogs(CW_LOG_GROUP) })
        );
        break;

      case 'use_real_data':
        useMockData = false;
        console.log('[CHANGE] Switched to real AWS data');
        break;

      case 'use_mock_data':
        useMockData = true;
        console.log('[CHANGE] Switched to mock data');
        break;

      default:
        console.log('[UNKNOWN] Unknown command:', data.command);
    }
  });

  ws.on('close', () => {
    console.log('[ERROR] Client disconnected');
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  ws.send(
    JSON.stringify({ type: 'connected', message: 'WebSocket server connected', timestamp: new Date().toISOString() })
  );
});

// ========================================
// Error Handling
// ========================================

process.on('uncaughtException', (error) => {
  console.error('[CRASH] Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('[CRASH] Unhandled Rejection:', error);
});

console.log(`
╔════════════════════════════════════════════╗
║  [START] Delightful Deployment Server Running  ║
║                                            ║
║  WebSocket: ws://localhost:${PORT}         ║
║  Status: Ready for connections             ║
╚════════════════════════════════════════════╝
`);
