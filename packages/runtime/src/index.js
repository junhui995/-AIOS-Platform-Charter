"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeEngine = void 0;
const openai_1 = require("openai");
const tools_1 = require("@aios/tools");
class RuntimeEngine {
    openai;
    astContext;
    constructor(ast) {
        this.astContext = ast;
        const apiKey = process.env.OPENAI_API_KEY;
        this.openai = apiKey ? new openai_1.OpenAI({ apiKey }) : null;
        if (!this.openai) {
            console.warn('[Runtime] No OPENAI_API_KEY found. Engine will run in Mock Mode.');
        }
    }
    async execute(userRequest) {
        console.log(`\n[Runtime] Processing request: "${userRequest}"`);
        const policies = this.astContext.nodes.filter((n) => n.type === 'Policy');
        const policyDescriptions = policies.map((p) => `- ${p.payload.description}`).join('\n');
        const systemPrompt = `
You are the AIOS Runtime Planner. Your job is to fulfill the user's request by calling the provided tools.
You must strictly follow the enterprise policies:
${policyDescriptions}

If an expense amount is > 500, you must NOT autoApproveExpense. You must use requestFinanceApproval.
First, find the employee ID if only the name is given. Then create the expense. Then evaluate the policy to either auto approve or request finance approval.
`;
        if (!this.openai) {
            return this.mockExecution(userRequest);
        }
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userRequest }
        ];
        const toolsArray = Object.values(tools_1.Tools).map((t) => {
            const tool = t;
            return {
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.schema
                }
            };
        });
        console.log('[Runtime] Starting Agent Execution Loop...');
        let isDone = false;
        while (!isDone) {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: messages,
                tools: toolsArray
            });
            const choice = response.choices[0];
            const message = choice.message;
            messages.push(message);
            if (message.tool_calls && message.tool_calls.length > 0) {
                for (const toolCall of message.tool_calls) {
                    if (toolCall.type !== 'function')
                        continue;
                    console.log(`\n[Agent Action] Intends to call: ${toolCall.function.name}`);
                    console.log(`[Agent Action] Arguments: ${toolCall.function.arguments}`);
                    const tool = tools_1.Tools[toolCall.function.name];
                    if (tool) {
                        try {
                            const args = JSON.parse(toolCall.function.arguments);
                            const result = await tool.execute(args);
                            console.log(`[Tool Result] ${JSON.stringify(result)}`);
                            messages.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: JSON.stringify(result)
                            });
                        }
                        catch (e) {
                            console.log(`[Tool Error] ${e.message}`);
                            messages.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: JSON.stringify({ error: e.message })
                            });
                        }
                    }
                    else {
                        console.log(`[Tool Error] Tool ${toolCall.function.name} not found.`);
                        messages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: JSON.stringify({ error: `Tool ${toolCall.function.name} not found.` })
                        });
                    }
                }
            }
            else {
                console.log(`\n[Agent Response] ${message.content}`);
                isDone = true;
            }
        }
    }
    async mockExecution(userRequest) {
        console.log('[Mock Agent] Analyzing intent: Create expense for Alice, amount 600.');
        console.log('[Mock Agent] Step 1: Getting Employee ID for "Alice"');
        const emp = tools_1.Tools.getEmployeeIdByName.execute({ name: 'Alice' });
        console.log(`[Tool Result] ${JSON.stringify(emp)}`);
        console.log('[Mock Agent] Step 2: Creating Expense Order');
        const exp = tools_1.Tools.createExpenseOrder.execute({ employeeId: emp.id, amount: 600, reason: 'Travel' });
        console.log(`[Tool Result] ${JSON.stringify(exp)}`);
        console.log('[Mock Agent] Step 3: Evaluating Policy (amount > 500 => require Finance Approval)');
        const req = tools_1.Tools.requestFinanceApproval.execute({ expenseId: exp.expenseId, reason: 'Amount 600 exceeds 500 limit' });
        console.log(`[Tool Result] ${JSON.stringify(req)}`);
        console.log(`\n[Agent Response] I have created expense ${exp.expenseId} for Alice for 600. Since it exceeds the 500 limit, I have requested Finance Manager approval.`);
    }
}
exports.RuntimeEngine = RuntimeEngine;
//# sourceMappingURL=index.js.map