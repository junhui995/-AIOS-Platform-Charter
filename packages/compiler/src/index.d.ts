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
export declare class Compiler {
    /**
     * Parses the Enterprise DNA YAML and converts it into a Business Semantic AST.
     */
    compile(yamlFilePath: string): BusinessSemanticAST;
}
