import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { Compiler, parseDna } from './index';

const invalidYaml = `
version: "1.0"
domain: ""
policies:
  - id: "pol"
    description: "desc"
    constraint: "x > 1"
    action: "approve"
`;

const danglingRefYaml = `
version: "1.0"
domain: "Finance"
policies:
  - id: "policy_expense_limit"
    description: "Any expense above 500 requires approval."
    constraint: "amount > 500"
    action: "require_approval"
workflows:
  - name: "ExpenseApproval"
    trigger: "ExpenseCreated"
    steps:
      - step_id: "check"
        action: "EvaluatePolicy"
        policy_ref: "policy_that_does_not_exist"
`;

describe('Compiler', () => {
  it('compiles the enterprise DNA example into a structural AST', () => {
    const dnaPath = path.resolve(process.cwd(), 'examples/enterprise-dna-demo/expense-dna.yaml');
    const ast = new Compiler().compile(dnaPath);

    expect(ast.version).toBe('1.0');
    expect(ast.domain).toBe('Finance');

    const types = ast.nodes.map((n) => n.type);
    expect(types).toContain('Entity');
    expect(types).toContain('Policy');
    expect(types).toContain('Workflow');
  });

  it('keeps the expense limit policy declared in the DNA', () => {
    const dnaPath = path.resolve(process.cwd(), 'examples/enterprise-dna-demo/expense-dna.yaml');
    const ast = new Compiler().compile(dnaPath);
    const policy = ast.nodes.find((n) => n.type === 'Policy');

    expect(policy?.id).toBe('policy_expense_limit');
    expect(policy?.payload.description).toContain('500');
  });

  it('throws when the DNA file does not exist', () => {
    expect(() => new Compiler().compile('C:/definitely/missing.yaml')).toThrow();
  });

  it('rejects invalid DNA instead of passing it through', () => {
    expect(() => parseDna(invalidYaml)).toThrow(/Invalid Enterprise DNA/);
  });

  it('rejects workflow steps referencing unknown policies', () => {
    expect(() => parseDna(danglingRefYaml)).toThrow(/unknown policy/);
  });
});