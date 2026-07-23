export interface ToolDefinition {
    name: string;
    description: string;
    schema: Record<string, any>;
    execute: (args: any) => Promise<any> | any;
}
export declare const Tools: Record<string, ToolDefinition>;
