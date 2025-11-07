module.exports = {
  awsRegion: process.env.AWS_REGION || 'ap-northeast-2',
  ecsClusterName: process.env.ECS_CLUSTER_NAME || 'chatapp-dev-cluster',
  ecsServiceNames: {
    blue: process.env.ECS_SERVICE_NAME_BLUE || 'chatapp-dev-service-blue',
    green: process.env.ECS_SERVICE_NAME_GREEN || 'chatapp-dev-service-green',
  },
  alb: {
    arn:
      process.env.ALB_ARN ||
      'arn:aws:elasticloadbalancing:ap-northeast-2:137068226866:loadbalancer/app/chatapp-dev-alb/df2c09c406bc14b1',
    dnsName:
      process.env.ALB_DNS_NAME || 'chatapp-dev-alb-1120994879.ap-northeast-2.elb.amazonaws.com',
    targetGroups: {
      blue:
        process.env.ALB_TARGET_GROUP_BLUE_ARN ||
        'arn:aws:elasticloadbalancing:ap-northeast-2:137068226866:targetgroup/chatapp-dev-blue-tg/7247c5293ea8d7f0',
      green:
        process.env.ALB_TARGET_GROUP_GREEN_ARN ||
        'arn:aws:elasticloadbalancing:ap-northeast-2:137068226866:targetgroup/chatapp-dev-green-tg/0b5e0e9f548f1388',
    },
  },
  cloudFrontDomain: process.env.CLOUDFRONT_DOMAIN || 'd3ro18w755ioec.cloudfront.net',
  dynamoDb: {
    tableArn:
      process.env.DYNAMODB_TABLE_ARN ||
      'arn:aws:dynamodb:ap-northeast-2:137068226866:table/chatapp-dev-messages',
    tableName: process.env.DYNAMODB_TABLE_NAME || 'chatapp-dev-messages',
  },
  ecrRepository: {
    name: process.env.ECR_REPOSITORY_NAME || 'chatapp-dev',
    url:
      process.env.ECR_REPOSITORY_URL ||
      '137068226866.dkr.ecr.ap-northeast-2.amazonaws.com/chatapp-dev',
  },
  redis: {
    endpoint:
      process.env.REDIS_ENDPOINT ||
      'chatapp-dev-redis.oi0xeh.ng.0001.apn2.cache.amazonaws.com',
    port: Number(process.env.REDIS_PORT) || 6379,
  },
  vpcId: process.env.VPC_ID || 'vpc-0d250e56fe804bcc2',
  subnetIds: {
    private: (process.env.PRIVATE_SUBNET_IDS || 'subnet-0b3d904cf1dbdeba8,subnet-060fd28d4588d2885')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
    public: (process.env.PUBLIC_SUBNET_IDS || 'subnet-05c7e7403756e0c39,subnet-04f2e774179a4f8a7')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  },
  internetGatewayId: process.env.INTERNET_GATEWAY_ID || 'igw-05a7cf9fa20c1eedd',
  natGatewayIds: (process.env.NAT_GATEWAY_IDS || 'nat-08757ecb55df3604c,nat-0acf864d22da01c64')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
  codePipelineName: process.env.CODEPIPELINE_NAME || 'chatapp-dev-pipeline',
  codeBuildProjectName: process.env.CODEBUILD_PROJECT_NAME || 'chatapp-dev-build',
  codeDeploy: {
    applicationName: process.env.CODEDEPLOY_APPLICATION_NAME || 'chatapp-dev-app',
    deploymentGroupName: process.env.CODEDEPLOY_DEPLOYMENT_GROUP_NAME || 'chatapp-dev-dg',
  },
  cloudWatch: {
    logGroupName: process.env.CLOUDWATCH_LOG_GROUP || '/aws/ecs/chatapp-dev-service-blue',
    metricPeriodSeconds: Number(process.env.CLOUDWATCH_PERIOD_SECONDS) || 60,
  },
};
