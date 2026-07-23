import { BusinessSemanticAST } from '@aios/compiler';
export declare class RuntimeEngine {
    private openai;
    private astContext;
    constructor(ast: BusinessSemanticAST);
    execute(userRequest: string): Promise<void>;
    private mockExecution;
}
