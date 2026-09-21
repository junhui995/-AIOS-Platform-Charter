import * as path from 'path';
import { Compiler } from '@aios/compiler';
import { eventBus } from '@aios/events';
import { RuntimeEngine } from './index';

interface CliArgs {
  prompt?: string;
  session?: string;
  resume?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] as string;
    if (a === '--session') args.session = argv[++i];
    else if (a === '--resume') args.resume = argv[++i];
    else positional.push(a);
  }
  args.prompt = positional[0];
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const defaultDnaPath = path.resolve(__dirname, '../../../examples/enterprise-dna-demo/expense-dna.yaml');
  const userPrompt = args.prompt ?? '帮 Alice 报销 600 块的打车费';

  console.log('[System] Initializing AIOS Runtime...');

  const compiler = new Compiler();
  const ast = compiler.compile(defaultDnaPath);
  console.log(`[System] Enterprise DNA Compiled Successfully (Version: ${ast.version}, Domain: ${ast.domain})`);

  const runtime = new RuntimeEngine(ast);

  // Start the outbox dispatcher (buffered in-memory if the DB is unavailable).
  eventBus.startDispatcher();

  try {
    if (args.resume) {
      const session = runtime.resume(args.resume);
      if (!session) {
        console.error(`[System] No checkpoint found for session "${args.resume}"`);
        return;
      }
      console.log(`[System] Resuming session "${session.sessionId}" (request: "${session.request}")`);
      await runtime.continueSession(args.resume);
    } else {
      await runtime.execute(userPrompt, { sessionId: args.session });
      console.log('\n[System] Checkpoint available. Interrupt and re-run with --resume <session-id> to continue.');
    }
  } finally {
    eventBus.stopDispatcher();
  }
}

main().catch(console.error);