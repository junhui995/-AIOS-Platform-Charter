/**
 * Next.js runtime instrumentation: boots the monitoring scheduler.
 * Runs once per Node.js server process (standalone/production) at startup.
 * In dev (`next dev`) use `instrumentationHook`; see next.config.mjs.
 */
import { monitorRepository } from '@aios/data-service';

const REGISTER = Symbol.for('@aios/monitor-scheduler');

interface SchedulerRegistration {
  startedAt: Date;
  timer: NodeJS.Timeout;
}

const globalRegistry = globalThis as unknown as { [REGISTER]?: SchedulerRegistration };

const TICK_MS = 60_000;

async function tick() {
  try {
    const summaries = await monitorRepository.runDueRules();
    if (summaries.length > 0) {
      console.log(
        `[monitor] scheduler tick ran ${summaries.length} due rule(s):`,
        summaries.map((s) => `${s.code}=${s.status}`).join(', '),
      );
    }
  } catch (err) {
    console.error('[monitor] scheduler tick failed:', err instanceof Error ? err.message : err);
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.MONITOR_SCHEDULER_DISABLED === '1') return;
  if (globalRegistry[REGISTER]) return;

  try {
    const seeded = await monitorRepository.seedDefaultRules(null);
    console.log('[monitor] seed:', seeded.join(', '));
  } catch (err) {
    console.error('[monitor] seed failed:', err instanceof Error ? err.message : err);
  }

  const timer = setInterval(tick, TICK_MS);
  timer.unref?.();
  globalRegistry[REGISTER] = { startedAt: new Date(), timer };
  console.log('[monitor] scheduler registered (tick every 60s)');
}