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

const PORT = 8080;

// WebSocket 서버 생성
const wss = new WebSocket.Server({ port: PORT });

console.log(`[START] WebSocket Server started on ws://localhost:${PORT}`);

// ========================================
// AWS CLI Helper Functions
// ========================================

/**
 * CloudWatch Metrics 가져오기
 */
async function getCloudWatchMetrics(serviceName) {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const startTime = fiveMinutesAgo.toISOString();
    const endTime = now.toISOString();

    const query = JSON.stringify([
        {
            Id: 'cpu',
            MetricStat: {
                Metric: {
                    Namespace: 'AWS/ECS',
                    MetricName: 'CPUUtilization',
                    Dimensions: [
                        { Name: 'ServiceName', Value: serviceName },
                        { Name: 'ClusterName', Value: 'softbank-demo-cluster' }
                    ]
                },
                Period: 60,
                Stat: 'Average'
            }
        },
        {
            Id: 'memory',
            MetricStat: {
                Metric: {
                    Namespace: 'AWS/ECS',
                    MetricName: 'MemoryUtilization',
                    Dimensions: [
                        { Name: 'ServiceName', Value: serviceName },
                        { Name: 'ClusterName', Value: 'softbank-demo-cluster' }
                    ]
                },
                Period: 60,
                Stat: 'Average'
            }
        }
    ]);

    try {
        const { stdout } = await execPromise(
            `aws cloudwatch get-metric-data \
                --metric-data-queries '${query}' \
                --start-time "${startTime}" \
                --end-time "${endTime}" \
                --region ap-northeast-1 \
                --output json`
        );

        const data = JSON.parse(stdout);

        // Extract latest values
        const cpuData = data.MetricDataResults.find(m => m.Id === 'cpu');
        const memoryData = data.MetricDataResults.find(m => m.Id === 'memory');

        return {
            cpu: cpuData?.Values[cpuData.Values.length - 1] || null,
            memory: memoryData?.Values[memoryData.Values.length - 1] || null,
            timestamp: now.toISOString()
        };
    } catch (error) {
        console.error(`[ERROR] Error fetching metrics for ${serviceName}:`, error.message);
        return null;
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
                --region ap-northeast-1 \
                --output json`
        );

        const data = JSON.parse(stdout);

        return data.events.map(event => ({
            timestamp: new Date(event.timestamp).toISOString(),
            message: event.message
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
                --region ap-northeast-1 \
                --output json`
        );

        const data = JSON.parse(stdout);

        // X-Ray 서비스 데이터를 프론트엔드 형식으로 변환
        const services = (data.Services || []).map(service => {
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
                timestamp: new Date().toISOString()
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

    // X-Ray 서비스 이름을 아키텍처 컴포넌트로 매핑
    const serviceMap = {
        'demo-alb': { name: 'ALB', position: [0, 3, 5] },
        'demo-blue-ecs-az1': { name: 'Blue-AZ1', position: [-4, 2, 2] },
        'demo-blue-ecs-az2': { name: 'Blue-AZ2', position: [-4, 2, -2] },
        'demo-green-ecs-az1': { name: 'Green-AZ1', position: [4, 2, 2] },
        'demo-green-ecs-az2': { name: 'Green-AZ2', position: [4, 2, -2] },
        'dynamodb': { name: 'DynamoDB', position: [0, 1, -4] },
        'elasticache-redis-az1': { name: 'Redis-AZ1', position: [-2, 0.5, 0] },
        'elasticache-redis-az2': { name: 'Redis-AZ2', position: [2, 0.5, 0] }
    };

    return xrayServices
        .map(service => {
            // X-Ray 서비스 이름에서 매핑 찾기
            const mappedService = Object.entries(serviceMap).find(([key]) =>
                service.name.toLowerCase().includes(key.toLowerCase())
            );

            if (mappedService) {
                return {
                    ...mappedService[1],
                    responseTime: service.responseTime,
                    errorRate: service.errorRate,
                    requestCount: service.requestCount
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
                --region ap-northeast-1 \
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
                --region ap-northeast-1 \
                --output json`
        );

        const data = JSON.parse(stdout);
        return {
            pipelineName: data.pipelineName,
            stages: data.stageStates || [],
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('[ERROR] Error fetching CodePipeline status:', error.message);
        return null;
    }
}

/**
 * CodeBuild 빌드 상태 가져오기
 */
async function getCodeBuildStatus(projectName = 'softbank-demo-build') {
    try {
        const { stdout } = await execPromise(
            `aws codebuild batch-get-builds \
                --ids $(aws codebuild list-builds-for-project \
                    --project-name ${projectName} \
                    --max-items 1 \
                    --region ap-northeast-1 \
                    --query 'ids[0]' \
                    --output text) \
                --region ap-northeast-1 \
                --output json`
        );

        const data = JSON.parse(stdout);
        const build = data.builds?.[0];

        return build ? {
            id: build.id,
            status: build.buildStatus,
            phase: build.currentPhase,
            startTime: build.startTime,
            endTime: build.endTime,
            logs: build.logs,
            timestamp: new Date().toISOString()
        } : null;
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
        // Get latest deployment
        const { stdout: listStdout } = await execPromise(
            `aws deploy list-deployments \
                --application-name ${applicationName} \
                --deployment-group-name ${deploymentGroupName} \
                --max-items 1 \
                --region ap-northeast-1 \
                --output json`
        );

        const listData = JSON.parse(listStdout);
        const deploymentId = listData.deployments?.[0];

        if (!deploymentId) return null;

        // Get deployment details
        const { stdout: detailStdout } = await execPromise(
            `aws deploy get-deployment \
                --deployment-id ${deploymentId} \
                --region ap-northeast-1 \
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
            timestamp: new Date().toISOString()
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
                --region ap-northeast-1 \
                --output json`
        );

        const data = JSON.parse(stdout);
        return {
            targets: data.TargetHealthDescriptions || [],
            timestamp: new Date().toISOString()
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
        timestamp: new Date().toISOString()
    };
}

function generateMockLogs() {
    const logTemplates = [
        { type: 'info', message: 'Request processed successfully' },
        { type: 'info', message: 'Health check passed' },
        { type: 'success', message: 'Database connection established' },
        { type: 'warning', message: 'High memory usage detected' },
        { type: 'info', message: 'Cache hit ratio: 87%' }
    ];

    const randomLog = logTemplates[Math.floor(Math.random() * logTemplates.length)];
    return {
        timestamp: new Date().toISOString(),
        type: randomLog.type,
        message: `[${randomLog.type.toUpperCase()}] ${randomLog.message}`
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
        const data = JSON.parse(message);

        switch (data.command) {
            case 'start_monitoring':
                console.log('[INFO] Starting real-time monitoring...');

                // 메트릭 데이터는 2초마다 전송
                intervalId = setInterval(async () => {
                    let blueMetrics, greenMetrics;

                    if (useMockData) {
                        // Mock 데이터 사용
                        blueMetrics = generateMockMetrics('blue');
                        greenMetrics = generateMockMetrics('green');
                    } else {
                        // 실제 AWS CloudWatch 데이터
                        blueMetrics = await getCloudWatchMetrics('demo-blue-service');
                        greenMetrics = await getCloudWatchMetrics('demo-green-service');
                    }

                    ws.send(JSON.stringify({
                        type: 'metrics',
                        data: {
                            blue: blueMetrics,
                            green: greenMetrics
                        }
                    }));

                    // 로그도 전송
                    if (useMockData) {
                        ws.send(JSON.stringify({
                            type: 'log',
                            data: generateMockLogs()
                        }));
                    }
                }, 2000);

                // X-Ray 서비스 맵은 10초마다 갱신
                const xrayInterval = setInterval(async () => {
                    if (!useMockData) {
                        const xrayServices = await getXRayServiceGraph();
                        const mappedServices = mapXRayToArchitecture(xrayServices);

                        if (mappedServices) {
                            ws.send(JSON.stringify({
                                type: 'xray_service_map',
                                data: mappedServices
                            }));
                        }
                    }
                }, 10000);

                // Cleanup에 xrayInterval 추가
                ws.on('close', () => {
                    if (xrayInterval) clearInterval(xrayInterval);
                });

                break;

            // 클라이언트가 1회성으로 메트릭 수집을 요청하면 즉시 수집 후 모든 클라이언트에게 브로드캐스트
            case 'fetch_metrics':
                try {
                    let blueMetrics, greenMetrics;
                    if (useMockData) {
                        blueMetrics = generateMockMetrics('blue');
                        greenMetrics = generateMockMetrics('green');
                    } else {
                        blueMetrics = await getCloudWatchMetrics('demo-blue-service');
                        greenMetrics = await getCloudWatchMetrics('demo-green-service');
                    }

                    const payload = JSON.stringify({
                        type: 'metrics',
                        data: { blue: blueMetrics, green: greenMetrics }
                    });

                    // 모든 접속자에게 브로드캐스트
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(payload);
                        }
                    });

                    // Mock 로그도 함께 전송(옵션)
                    if (useMockData) {
                        const logPayload = JSON.stringify({ type: 'log', data: generateMockLogs() });
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(logPayload);
                            }
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
                const pipelineStatus = await getCodePipelineStatus();
                ws.send(JSON.stringify({
                    type: 'pipeline_status',
                    data: pipelineStatus
                }));
                break;

            case 'get_codebuild_status':
                const buildStatus = await getCodeBuildStatus();
                ws.send(JSON.stringify({
                    type: 'codebuild_status',
                    data: buildStatus
                }));
                break;

            case 'get_codedeploy_status':
                const deployStatus = await getCodeDeployStatus();
                ws.send(JSON.stringify({
                    type: 'codedeploy_status',
                    data: deployStatus
                }));
                break;

            case 'get_alb_health':
                const targetGroupArn = data.targetGroupArn;
                if (targetGroupArn) {
                    const health = await getALBTargetHealth(targetGroupArn);
                    ws.send(JSON.stringify({
                        type: 'alb_health',
                        data: health
                    }));
                }
                break;

            case 'get_xray_graph':
                const serviceGraph = await getXRayServiceGraph();
                ws.send(JSON.stringify({
                    type: 'xray_service_graph',
                    data: serviceGraph
                }));
                break;

            case 'get_logs':
                const logs = useMockData
                    ? [generateMockLogs(), generateMockLogs(), generateMockLogs()]
                    : await getCloudWatchLogs('/ecs/softbank-demo');
                ws.send(JSON.stringify({
                    type: 'logs',
                    data: logs
                }));
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

    // 연결 종료
    ws.on('close', () => {
        console.log('[ERROR] Client disconnected');
        if (intervalId) {
            clearInterval(intervalId);
        }
    });

    // 초기 연결 메시지
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket server connected',
        timestamp: new Date().toISOString()
    }));
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
