import * as path from 'path';
import { Compiler } from '@aios/compiler';
import { RuntimeEngine } from './index';

async function main() {
    const defaultDnaPath = path.resolve(__dirname, '../../../examples/enterprise-dna-demo/expense-dna.yaml');

    // Read the user prompt from CLI arguments, fallback to a default prompt
    const userPrompt = process.argv[2] || "帮 Alice 报销 600 块打车费";

    console.log('[System] Initializing AIOS Runtime...');

    // Step 1: Compile DNA
    const compiler = new Compiler();
    const ast = compiler.compile(defaultDnaPath);
    console.log(`[System] Enterprise DNA Compiled Successfully (Version: ${ast.version}, Domain: ${ast.domain})`);

    // Step 2: Initialize Runtime with AST Context
    const runtime = new RuntimeEngine(ast);

    // Step 3: Execute Request
    await runtime.execute(userPrompt);
}

main().catch(console.error);
