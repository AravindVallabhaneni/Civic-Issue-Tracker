import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(10),
  CLUSTER_RADIUS_METERS: z.coerce.number().default(150),
  ESCALATION_DAYS_THRESHOLD: z.coerce.number().default(3),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  // In dev, use defaults; in prod, crash
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const env = parsed.success ? parsed.data : {
  SUPABASE_URL: process.env.SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'dev-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-service-key',
  PORT: 3001,
  NODE_ENV: 'development' as const,
  FRONTEND_URL: 'http://localhost:5173',
  RATE_LIMIT_WINDOW_MS: 900000,
  RATE_LIMIT_MAX_REQUESTS: 10,
  CLUSTER_RADIUS_METERS: 150,
  ESCALATION_DAYS_THRESHOLD: 3,
  LOG_LEVEL: 'info' as const,
};

export const config = {
  supabaseUrl: env.SUPABASE_URL,
  supabaseAnonKey: env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  frontendUrl: env.FRONTEND_URL,
  rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  clusterRadiusMeters: env.CLUSTER_RADIUS_METERS,
  escalationDaysThreshold: env.ESCALATION_DAYS_THRESHOLD,
  logLevel: env.LOG_LEVEL,
};
