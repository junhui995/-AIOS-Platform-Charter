import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

export interface BusinessSemanticAST {
    version: string;
    domain: string;
    nodes: ASTNode[];
}

export interface ASTNode {
    type: 'Entity' | 'Policy' | 'Workflow';
    id: string;
    payload: any;
}

export class Compiler {
    /**
     * Parses the Enterprise DNA YAML and converts it into a Business Semantic AST.
     */
    public compile(yamlFilePath: string): BusinessSemanticAST {
        try {
            const fileContents = fs.readFileSync(yamlFilePath, 'utf8');
            const dna = yaml.load(fileContents) as any;

            const ast: BusinessSemanticAST = {
                version: dna.version || '1.0',
                domain: dna.domain || 'Unknown',
                nodes: []
            };

            // Parse Entities
            if (dna.entities && Array.isArray(dna.entities)) {
                dna.entities.forEach((entity: any) => {
                    ast.nodes.push({
                        type: 'Entity',
                        id: `entity_${entity.name.toLowerCase()}`,
                        payload: entity
                    });
                });
            }

            // Parse Policies
            if (dna.policies && Array.isArray(dna.policies)) {
                dna.policies.forEach((policy: any) => {
                    ast.nodes.push({
                        type: 'Policy',
                        id: policy.id,
                        payload: policy
                    });
                });
            }

            // Parse Workflows
            if (dna.workflows && Array.isArray(dna.workflows)) {
                dna.workflows.forEach((wf: any) => {
                    ast.nodes.push({
                        type: 'Workflow',
                        id: `wf_${wf.name.toLowerCase()}`,
                        payload: wf
                    });
                });
            }

            return ast;

        } catch (e) {
            console.error('Compilation failed:', e);
            throw e;
        }
    }
}

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