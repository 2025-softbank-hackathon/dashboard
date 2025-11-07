import json
import boto3
from datetime import datetime, timedelta

# 고정 값 주입
DDB_TABLE_NAME      = "dev-websocket-connections2"
ECS_CLUSTER_NAME    = "chatapp-dev-cluster"
BLUE_SERVICE_NAME   = "chatapp-dev-service-blue"
GREEN_SERVICE_NAME  = "chatapp-dev-service-green"
ALB_ARN_SUFFIX      = "app/chatapp-dev-alb/df2c09c406bc14b1"
BLUE_TARGET_GROUP   = "targetgroup/chatapp-dev-blue-tg/7247c5293ea8d7f0"
GREEN_TARGET_GROUP  = "targetgroup/chatapp-dev-green-tg/0b5e0e9f548f1388"
API_GW_ENDPOINT_URL = "https://rysusu6e4a.execute-api.ap-northeast-2.amazonaws.com/dev"

dynamodb = boto3.resource("dynamodb")
cloudwatch = boto3.client("cloudwatch")
apigateway_management = None

def get_apigateway_management_client(endpoint_url: str):
    global apigateway_management
    if not endpoint_url:
        raise ValueError("API Gateway endpoint_url is required")
    if apigateway_management is None or apigateway_management.meta.endpoint_url != endpoint_url:
        print(f"Initializing API Gateway Management client for endpoint: {endpoint_url}")
        apigateway_management = boto3.client("apigatewaymanagementapi", endpoint_url=endpoint_url)
    return apigateway_management

def handle_connect(connection_id: str):
    table = dynamodb.Table(DDB_TABLE_NAME)
    table.put_item(Item={"pk": connection_id, "connectionId": connection_id})
    print(f"Connection successful: {connection_id}")
    return {"statusCode": 200, "body": "Connected."}

def handle_disconnect(connection_id: str):
    table = dynamodb.Table(DDB_TABLE_NAME)
    table.delete_item(Key={"pk": connection_id})
    print(f"Connection disconnected: {connection_id}")
    return {"statusCode": 200, "body": "Disconnected."}

def get_cloudwatch_metrics(start_time: datetime, end_time: datetime) -> dict:
    print("Fetching CloudWatch metrics...")

    metric_queries = [
        { "Id": "ecs_cpu_blue", "Label": "ECS_CPU_Blue",
          "MetricStat": { "Metric": { "Namespace": "AWS/ECS", "MetricName": "CPUUtilization",
            "Dimensions": [ {"Name": "ClusterName","Value": ECS_CLUSTER_NAME},
                            {"Name": "ServiceName","Value": BLUE_SERVICE_NAME} ] },
            "Period": 60, "Stat": "Average" } },
        { "Id": "ecs_mem_blue", "Label": "ECS_Memory_Blue",
          "MetricStat": { "Metric": { "Namespace": "AWS/ECS", "MetricName": "MemoryUtilization",
            "Dimensions": [ {"Name": "ClusterName","Value": ECS_CLUSTER_NAME},
                            {"Name": "ServiceName","Value": BLUE_SERVICE_NAME} ] },
            "Period": 60, "Stat": "Average" } },
        { "Id": "ecs_cpu_green", "Label": "ECS_CPU_Green",
          "MetricStat": { "Metric": { "Namespace": "AWS/ECS", "MetricName": "CPUUtilization",
            "Dimensions": [ {"Name": "ClusterName","Value": ECS_CLUSTER_NAME},
                            {"Name": "ServiceName","Value": GREEN_SERVICE_NAME} ] },
            "Period": 60, "Stat": "Average" } },
        { "Id": "ecs_mem_green", "Label": "ECS_Memory_Green",
          "MetricStat": { "Metric": { "Namespace": "AWS/ECS", "MetricName": "MemoryUtilization",
            "Dimensions": [ {"Name": "ClusterName","Value": ECS_CLUSTER_NAME},
                            {"Name": "ServiceName","Value": GREEN_SERVICE_NAME} ] },
            "Period": 60, "Stat": "Average" } },
        { "Id": "alb_req_blue", "Label": "ALB_Requests_Blue",
          "MetricStat": { "Metric": { "Namespace": "AWS/ApplicationELB", "MetricName": "RequestCount",
            "Dimensions": [ {"Name": "TargetGroup","Value": BLUE_TARGET_GROUP},
                            {"Name": "LoadBalancer","Value": ALB_ARN_SUFFIX} ] },
            "Period": 60, "Stat": "Sum" } },
        { "Id": "alb_req_green", "Label": "ALB_Requests_Green",
          "MetricStat": { "Metric": { "Namespace": "AWS/ApplicationELB", "MetricName": "RequestCount",
            "Dimensions": [ {"Name": "TargetGroup","Value": GREEN_TARGET_GROUP},
                            {"Name": "LoadBalancer","Value": ALB_ARN_SUFFIX} ] },
            "Period": 60, "Stat": "Sum" } },
        { "Id": "alb_res_blue", "Label": "ALB_ResponseTime_Blue",
          "MetricStat": { "Metric": { "Namespace": "AWS/ApplicationELB", "MetricName": "TargetResponseTime",
            "Dimensions": [ {"Name": "TargetGroup","Value": BLUE_TARGET_GROUP},
                            {"Name": "LoadBalancer","Value": ALB_ARN_SUFFIX} ] },
            "Period": 60, "Stat": "Average" } },
        { "Id": "alb_res_green", "Label": "ALB_ResponseTime_Green",
          "MetricStat": { "Metric": { "Namespace": "AWS/ApplicationELB", "MetricName": "TargetResponseTime",
            "Dimensions": [ {"Name": "TargetGroup","Value": GREEN_TARGET_GROUP},
                            {"Name": "LoadBalancer","Value": ALB_ARN_SUFFIX} ] },
            "Period": 60, "Stat": "Average" } },
        { "Id": "alb_5xx_blue", "Label": "ALB_Errors_5xx_Blue",
          "MetricStat": { "Metric": { "Namespace": "AWS/ApplicationELB", "MetricName": "HTTPCode_Target_5XX_Count",
            "Dimensions": [ {"Name": "TargetGroup","Value": BLUE_TARGET_GROUP},
                            {"Name": "LoadBalancer","Value": ALB_ARN_SUFFIX} ] },
            "Period": 60, "Stat": "Sum" } },
        { "Id": "alb_5xx_green", "Label": "ALB_Errors_5xx_Green",
          "MetricStat": { "Metric": { "Namespace": "AWS/ApplicationELB", "MetricName": "HTTPCode_Target_5XX_Count",
            "Dimensions": [ {"Name": "TargetGroup","Value": GREEN_TARGET_GROUP},
                            {"Name": "LoadBalancer","Value": ALB_ARN_SUFFIX} ] },
            "Period": 60, "Stat": "Sum" } },
    ]

    try:
        resp = cloudwatch.get_metric_data(
            MetricDataQueries=metric_queries,
            StartTime=start_time,
            EndTime=end_time,
            ScanBy="TimestampDescending",
        )
        out = {}
        for m in resp.get("MetricDataResults", []):
            label = m.get("Label")
            values = m.get("Values") or []
            out[label] = values[0] if values else 0
        print(f"Fetched CloudWatch metrics: {list(out.keys())}")
        return out
    except Exception as e:
        print(f"Error fetching CloudWatch metrics: {e}")
        return {}

def send_data_to_all(endpoint_url: str):
    table = dynamodb.Table(DDB_TABLE_NAME)
    conns = table.scan(ProjectionExpression="connectionId").get("Items", [])
    if not conns:
        print("No active connections. Skipping")
        return

    end_time = datetime.utcnow()
    start_time = end_time - timedelta(minutes=2)

    metrics = get_cloudwatch_metrics(start_time, end_time)
    payload = json.dumps({
        "cloudwatch_metrics": metrics,
        "timestamp": end_time.isoformat()
    })

    api = get_apigateway_management_client(endpoint_url)
    for c in conns:
        cid = c["connectionId"]
        try:
            api.post_to_connection(ConnectionId=cid, Data=payload)
        except api.exceptions.GoneException:
            print(f"Connection {cid} gone. Deleting")
            handle_disconnect(cid)
        except Exception as e:
            print(f"Failed to post to {cid}: {e}")

def lambda_handler(event, context):
    print(f"Received event: {json.dumps(event)}")

    if event.get("source") == "aws.events":
        print("Triggered by EventBridge scheduler")
        send_data_to_all(API_GW_ENDPOINT_URL)
        return {"statusCode": 200, "body": "Broadcast via scheduler ok"}

    rc = event.get("requestContext", {}) or {}
    route_key = rc.get("routeKey")
    connection_id = rc.get("connectionId")

    if not route_key or not connection_id:
        return {"statusCode": 400, "body": "Invalid request"}

    if route_key == "$connect":
        return handle_connect(connection_id)
    if route_key == "$disconnect":
        return handle_disconnect(connection_id)

    domain_name = rc.get("domainName")
    stage = rc.get("stage")
    endpoint_url = f"https://{domain_name}/{stage}"
    send_data_to_all(endpoint_url)
    return {"statusCode": 200, "body": "Broadcast ok"}