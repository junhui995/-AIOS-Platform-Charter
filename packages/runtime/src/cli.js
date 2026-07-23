"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const compiler_1 = require("@aios/compiler");
const index_1 = require("./index");
async function main() {
    const defaultDnaPath = path.resolve(__dirname, '../../../examples/enterprise-dna-demo/expense-dna.yaml');
    // Read the user prompt from CLI arguments, fallback to a default prompt
    const userPrompt = process.argv[2] || "帮 Alice 报销 600 块打车费";
    console.log('[System] Initializing AIOS Runtime...');
    // Step 1: Compile DNA
    const compiler = new compiler_1.Compiler();
    const ast = compiler.compile(defaultDnaPath);
    console.log(`[System] Enterprise DNA Compiled Successfully (Version: ${ast.version}, Domain: ${ast.domain})`);
    // Step 2: Initialize Runtime with AST Context
    const runtime = new index_1.RuntimeEngine(ast);
    // Step 3: Execute Request
    await runtime.execute(userPrompt);
}
main().catch(console.error);
//# sourceMappingURL=cli.js.map