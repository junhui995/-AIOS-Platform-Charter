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
exports.Compiler = void 0;
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
const path = __importStar(require("path"));
class Compiler {
    /**
     * Parses the Enterprise DNA YAML and converts it into a Business Semantic AST.
     */
    compile(yamlFilePath) {
        try {
            const fileContents = fs.readFileSync(yamlFilePath, 'utf8');
            const dna = yaml.load(fileContents);
            const ast = {
                version: dna.version || '1.0',
                domain: dna.domain || 'Unknown',
                nodes: []
            };
            // Parse Entities
            if (dna.entities && Array.isArray(dna.entities)) {
                dna.entities.forEach((entity) => {
                    ast.nodes.push({
                        type: 'Entity',
                        id: `entity_${entity.name.toLowerCase()}`,
                        payload: entity
                    });
                });
            }
            // Parse Policies
            if (dna.policies && Array.isArray(dna.policies)) {
                dna.policies.forEach((policy) => {
                    ast.nodes.push({
                        type: 'Policy',
                        id: policy.id,
                        payload: policy
                    });
                });
            }
            // Parse Workflows
            if (dna.workflows && Array.isArray(dna.workflows)) {
                dna.workflows.forEach((wf) => {
                    ast.nodes.push({
                        type: 'Workflow',
                        id: `wf_${wf.name.toLowerCase()}`,
                        payload: wf
                    });
                });
            }
            return ast;
        }
        catch (e) {
            console.error('Compilation failed:', e);
            throw e;
        }
    }
}
exports.Compiler = Compiler;
// Simple CLI runner for prototype
if (require.main === module) {
    const defaultDnaPath = path.resolve(__dirname, '../../../examples/enterprise-dna-demo/expense-dna.yaml');
    const inputPath = process.argv[2] || defaultDnaPath;
    console.log(`[Compiler] Reading DNA from: ${inputPath}`);
    const compiler = new Compiler();
    const ast = compiler.compile(inputPath);
    console.log('\n[Compiler] Generated Business Semantic AST:');
    console.log(JSON.stringify(ast, null, 2));
}
//# sourceMappingURL=index.js.map