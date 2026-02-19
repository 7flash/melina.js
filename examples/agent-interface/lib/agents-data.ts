export type AgentStatus = "running" | "idle" | "error" | "paused"

export type Job = {
    id: string
    name: string
    status: "running" | "completed" | "failed" | "queued"
    startedAt: string
    progress?: number
}

export type LogEntry = {
    id: string
    timestamp: string
    level: "info" | "warn" | "error" | "debug"
    message: string
}

export type MemoryEntry = {
    id: string
    key: string
    value: string
    updatedAt: string
}

export type Message = {
    id: string
    role: "user" | "orchestrator"
    content: string
    timestamp: string
}

export type Agent = {
    id: string
    name: string
    description: string
    status: AgentStatus
    telegramGroup: string
    avatar: string
    lastActive: string
    messages: Message[]
    memory: MemoryEntry[]
    logs: LogEntry[]
    sourceCode: string
    jobs: Job[]
}

export const agents: Agent[] = [
    {
        id: "agent-1",
        name: "DataPipeline",
        description: "Ingests and transforms data from multiple sources",
        status: "running",
        telegramGroup: "https://t.me/datapipeline_group",
        avatar: "DP",
        lastActive: "2 min ago",
        messages: [
            { id: "m1", role: "user", content: "What's the current status of DataPipeline?", timestamp: "10:32 AM" },
            { id: "m2", role: "orchestrator", content: "DataPipeline is currently running. It has processed 12,847 records in the last hour with a 99.2% success rate. There are 3 active jobs running and 1 queued.", timestamp: "10:32 AM" },
            { id: "m3", role: "user", content: "Can you increase its batch size to 500?", timestamp: "10:34 AM" },
            { id: "m4", role: "orchestrator", content: "Done. I've updated the batch_size parameter in DataPipeline's configuration from 200 to 500. The change will take effect on the next batch cycle (~45 seconds).", timestamp: "10:34 AM" },
            { id: "m5", role: "user", content: "Show me the error rate trend", timestamp: "10:40 AM" },
            { id: "m6", role: "orchestrator", content: "Error rate over the last 24h: peaked at 2.1% at 03:00 UTC (timeout issues with upstream API), now stabilized at 0.8%. I've already configured automatic retries for those timeout errors.", timestamp: "10:40 AM" },
        ],
        memory: [
            { id: "mem1", key: "batch_size", value: "500", updatedAt: "10:34 AM" },
            { id: "mem2", key: "source_endpoints", value: '["api.data.io/v2", "stream.feed.co/events"]', updatedAt: "9:00 AM" },
            { id: "mem3", key: "retry_policy", value: '{"max_retries": 3, "backoff": "exponential"}', updatedAt: "Yesterday" },
            { id: "mem4", key: "output_format", value: "parquet", updatedAt: "2 days ago" },
            { id: "mem5", key: "schedule", value: "*/5 * * * *", updatedAt: "3 days ago" },
        ],
        logs: [
            { id: "l1", timestamp: "10:41:23", level: "info", message: "Batch #8847 completed: 500 records processed in 2.3s" },
            { id: "l2", timestamp: "10:40:55", level: "info", message: "Starting batch #8847 from api.data.io/v2" },
            { id: "l3", timestamp: "10:40:12", level: "warn", message: "Slow response from stream.feed.co/events (1.8s)" },
            { id: "l4", timestamp: "10:39:45", level: "info", message: "Batch #8846 completed: 500 records processed in 1.9s" },
            { id: "l5", timestamp: "10:38:30", level: "error", message: "Connection timeout to api.data.io/v2 - retrying (attempt 1/3)" },
            { id: "l6", timestamp: "10:38:33", level: "info", message: "Retry successful for api.data.io/v2" },
            { id: "l7", timestamp: "10:37:10", level: "debug", message: "Memory usage: 245MB / 512MB (47.8%)" },
            { id: "l8", timestamp: "10:36:00", level: "info", message: "Batch #8845 completed: 498 records processed in 2.1s" },
        ],
        sourceCode: `import { Pipeline } from '@agent/core'
import { ParquetWriter } from '@agent/io'

const pipeline = new Pipeline({
  name: 'DataPipeline',
  schedule: '*/5 * * * *',
  batchSize: 500,
})

pipeline.source('api.data.io/v2', {
  auth: process.env.DATA_API_KEY,
  format: 'json',
})

pipeline.source('stream.feed.co/events', {
  auth: process.env.FEED_API_KEY,
  format: 'sse',
})

pipeline.transform(async (records) => {
  return records
    .filter(r => r.status === 'valid')
    .map(r => ({
      ...r,
      processed_at: new Date().toISOString(),
      normalized: normalize(r.payload),
    }))
})

pipeline.sink(new ParquetWriter({
  path: 's3://data-lake/processed/',
  partitionBy: ['date', 'source'],
}))

pipeline.onError(async (err, batch) => {
  await retry(batch, {
    maxRetries: 3,
    backoff: 'exponential',
  })
})

export default pipeline`,
        jobs: [
            { id: "j1", name: "Ingest from api.data.io", status: "running", startedAt: "10:40 AM", progress: 67 },
            { id: "j2", name: "Ingest from stream.feed.co", status: "running", startedAt: "10:38 AM", progress: 89 },
            { id: "j3", name: "Transform batch #8847", status: "running", startedAt: "10:41 AM", progress: 23 },
            { id: "j4", name: "Write to S3 parquet", status: "queued", startedAt: "Pending" },
        ],
    },
    {
        id: "agent-2",
        name: "SentimentBot",
        description: "Analyzes customer sentiment from support tickets",
        status: "idle",
        telegramGroup: "https://t.me/sentimentbot_group",
        avatar: "SB",
        lastActive: "15 min ago",
        messages: [
            { id: "m1", role: "user", content: "How's SentimentBot doing?", timestamp: "9:15 AM" },
            { id: "m2", role: "orchestrator", content: "SentimentBot is idle. Last analysis run completed at 9:00 AM. Processed 342 tickets with an average sentiment score of 0.72 (positive). No errors detected.", timestamp: "9:15 AM" },
            { id: "m3", role: "user", content: "Schedule it to run every 30 minutes instead of hourly", timestamp: "9:20 AM" },
            { id: "m4", role: "orchestrator", content: "Updated SentimentBot's schedule from hourly to every 30 minutes. Next run will be at 9:30 AM.", timestamp: "9:20 AM" },
        ],
        memory: [
            { id: "mem1", key: "model", value: "sentiment-v3-large", updatedAt: "Yesterday" },
            { id: "mem2", key: "threshold", value: "0.65", updatedAt: "2 days ago" },
            { id: "mem3", key: "languages", value: '["en", "es", "fr", "de"]', updatedAt: "3 days ago" },
        ],
        logs: [
            { id: "l1", timestamp: "9:00:12", level: "info", message: "Analysis complete: 342 tickets processed" },
            { id: "l2", timestamp: "8:58:30", level: "info", message: "Starting sentiment analysis batch" },
            { id: "l3", timestamp: "8:55:00", level: "debug", message: "Model loaded: sentiment-v3-large (1.2GB)" },
        ],
        sourceCode: `import { Agent } from '@agent/core'
import { SentimentModel } from '@agent/nlp'

const agent = new Agent({
  name: 'SentimentBot',
  schedule: '*/30 * * * *',
})

const model = new SentimentModel('sentiment-v3-large')

agent.task('analyze-tickets', async (ctx) => {
  const tickets = await ctx.fetch('/api/tickets', {
    status: 'unanalyzed',
    limit: 500,
  })

  const results = await model.analyzeBatch(
    tickets.map(t => t.content),
    { languages: ['en', 'es', 'fr', 'de'] }
  )

  await ctx.store(results.map((r, i) => ({
    ticketId: tickets[i].id,
    sentiment: r.score,
    label: r.label,
    confidence: r.confidence,
  })))
})

export default agent`,
        jobs: [
            { id: "j1", name: "Hourly sentiment analysis", status: "completed", startedAt: "9:00 AM" },
        ],
    },
    {
        id: "agent-3",
        name: "DeployBot",
        description: "Manages CI/CD deployments and rollbacks",
        status: "error",
        telegramGroup: "https://t.me/deploybot_group",
        avatar: "DB",
        lastActive: "5 min ago",
        messages: [
            { id: "m1", role: "user", content: "DeployBot seems to be having issues, what happened?", timestamp: "10:25 AM" },
            { id: "m2", role: "orchestrator", content: "DeployBot encountered an error during the latest deployment of `api-service` to production. The health check failed after deployment - the service returned 503 on /health. I've automatically initiated a rollback to the previous version (v2.4.1).", timestamp: "10:25 AM" },
            { id: "m3", role: "user", content: "Is the rollback complete?", timestamp: "10:30 AM" },
            { id: "m4", role: "orchestrator", content: "Rollback to v2.4.1 completed successfully. All health checks passing. The failed deployment (v2.5.0) logs indicate a missing DATABASE_URL environment variable in the new config. You may want to fix the deployment config before retrying.", timestamp: "10:30 AM" },
        ],
        memory: [
            { id: "mem1", key: "current_version", value: "v2.4.1 (rolled back)", updatedAt: "10:30 AM" },
            { id: "mem2", key: "failed_version", value: "v2.5.0", updatedAt: "10:25 AM" },
            { id: "mem3", key: "deploy_target", value: "k8s-prod-cluster", updatedAt: "Yesterday" },
            { id: "mem4", key: "rollback_policy", value: "auto_on_health_fail", updatedAt: "5 days ago" },
        ],
        logs: [
            { id: "l1", timestamp: "10:30:05", level: "info", message: "Rollback to v2.4.1 complete - all health checks passing" },
            { id: "l2", timestamp: "10:28:30", level: "warn", message: "Initiating automatic rollback to v2.4.1" },
            { id: "l3", timestamp: "10:27:45", level: "error", message: "Health check failed: /health returned 503 (expected 200)" },
            { id: "l4", timestamp: "10:27:00", level: "error", message: "Deployment v2.5.0 failed: missing env var DATABASE_URL" },
            { id: "l5", timestamp: "10:25:00", level: "info", message: "Deploying api-service v2.5.0 to k8s-prod-cluster" },
        ],
        sourceCode: `import { Agent } from '@agent/core'
import { K8sClient } from '@agent/k8s'

const agent = new Agent({
  name: 'DeployBot',
  triggers: ['webhook:github', 'manual'],
})

const k8s = new K8sClient({
  cluster: 'k8s-prod-cluster',
  namespace: 'production',
})

agent.task('deploy', async (ctx) => {
  const { service, version, image } = ctx.params

  await k8s.deploy({
    service,
    image: \`registry.io/\${service}:\${version}\`,
    replicas: 3,
    healthCheck: '/health',
    timeout: 120,
  })

  const healthy = await k8s.waitForHealth(service)
  
  if (!healthy) {
    await ctx.rollback(service)
    throw new Error('Health check failed')
  }
})

agent.task('rollback', async (ctx) => {
  const previous = await ctx.memory.get('previous_version')
  await k8s.deploy({ ...previous, force: true })
})

export default agent`,
        jobs: [
            { id: "j1", name: "Rollback api-service to v2.4.1", status: "completed", startedAt: "10:28 AM" },
            { id: "j2", name: "Deploy api-service v2.5.0", status: "failed", startedAt: "10:25 AM" },
        ],
    },
    {
        id: "agent-4",
        name: "ContentWriter",
        description: "Generates and publishes blog content on schedule",
        status: "running",
        telegramGroup: "https://t.me/contentwriter_group",
        avatar: "CW",
        lastActive: "1 min ago",
        messages: [
            { id: "m1", role: "user", content: "What's ContentWriter working on right now?", timestamp: "10:42 AM" },
            { id: "m2", role: "orchestrator", content: "ContentWriter is currently generating a blog post titled \"10 Best Practices for API Design in 2026\". It's in the drafting phase - about 60% complete. Estimated completion in ~3 minutes.", timestamp: "10:42 AM" },
        ],
        memory: [
            { id: "mem1", key: "tone", value: "professional, conversational", updatedAt: "Today" },
            { id: "mem2", key: "word_count_target", value: "1500-2000", updatedAt: "Yesterday" },
            { id: "mem3", key: "publishing_platform", value: "ghost-cms", updatedAt: "3 days ago" },
        ],
        logs: [
            { id: "l1", timestamp: "10:42:00", level: "info", message: "Drafting: '10 Best Practices for API Design in 2026' (60%)" },
            { id: "l2", timestamp: "10:40:30", level: "info", message: "Research phase complete - 8 sources gathered" },
            { id: "l3", timestamp: "10:39:00", level: "info", message: "Starting content generation for scheduled post" },
        ],
        sourceCode: `import { Agent } from '@agent/core'
import { LLM } from '@agent/ai'
import { GhostCMS } from '@agent/publishing'

const agent = new Agent({
  name: 'ContentWriter',
  schedule: '0 10 * * 1,3,5',
})

const llm = new LLM('gpt-4o')
const cms = new GhostCMS(process.env.GHOST_API_KEY)

agent.task('generate-post', async (ctx) => {
  const topic = await ctx.memory.get('next_topic')
  
  const research = await llm.research(topic, {
    sources: 8,
    maxDepth: 2,
  })

  const draft = await llm.generate({
    prompt: \`Write a blog post about: \${topic}\`,
    context: research,
    tone: 'professional, conversational',
    wordCount: { min: 1500, max: 2000 },
  })

  await cms.publish(draft, { status: 'draft' })
})

export default agent`,
        jobs: [
            { id: "j1", name: "Generate blog post: API Design", status: "running", startedAt: "10:39 AM", progress: 60 },
        ],
    },
    {
        id: "agent-5",
        name: "SecurityScanner",
        description: "Monitors and scans for security vulnerabilities",
        status: "paused",
        telegramGroup: "https://t.me/secscanner_group",
        avatar: "SS",
        lastActive: "1 hour ago",
        messages: [
            { id: "m1", role: "user", content: "Why is SecurityScanner paused?", timestamp: "9:45 AM" },
            { id: "m2", role: "orchestrator", content: "SecurityScanner was paused manually at 9:30 AM. The last scan found 2 medium-severity vulnerabilities in the `auth-service` dependencies (CVE-2026-1234, CVE-2026-1235). Paused to prevent alert fatigue while the team reviews.", timestamp: "9:45 AM" },
        ],
        memory: [
            { id: "mem1", key: "scan_targets", value: '["auth-service", "api-gateway", "user-service"]', updatedAt: "Today" },
            { id: "mem2", key: "severity_threshold", value: "medium", updatedAt: "1 week ago" },
            { id: "mem3", key: "last_cve_found", value: "CVE-2026-1235", updatedAt: "9:30 AM" },
        ],
        logs: [
            { id: "l1", timestamp: "9:30:00", level: "warn", message: "Agent paused by user" },
            { id: "l2", timestamp: "9:28:45", level: "warn", message: "Found CVE-2026-1235 (medium) in auth-service" },
            { id: "l3", timestamp: "9:28:30", level: "warn", message: "Found CVE-2026-1234 (medium) in auth-service" },
            { id: "l4", timestamp: "9:25:00", level: "info", message: "Starting security scan for auth-service" },
        ],
        sourceCode: `import { Agent } from '@agent/core'
import { VulnScanner } from '@agent/security'

const agent = new Agent({
  name: 'SecurityScanner',
  schedule: '0 */6 * * *',
})

const scanner = new VulnScanner({
  severityThreshold: 'medium',
  databases: ['nvd', 'ghsa', 'osv'],
})

agent.task('scan', async (ctx) => {
  const targets = await ctx.memory.get('scan_targets')
  
  for (const target of targets) {
    const results = await scanner.scan(target)
    
    if (results.vulnerabilities.length > 0) {
      await ctx.alert({
        channel: 'telegram',
        severity: results.maxSeverity,
        findings: results.vulnerabilities,
      })
    }
  }
})

export default agent`,
        jobs: [],
    },
]
