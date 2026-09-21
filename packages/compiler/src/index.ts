import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enterprise DNA Configuration Schema (validated, no `any` passthrough)
// ---------------------------------------------------------------------------

export const entitySchema = z.object({
  name: z.string().min(1),
  attributes: z.record(z.string()).default({}),
});
export type EntityConfig = z.infer<typeof entitySchema>;

export const policySchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  constraint: z.string().min(1),
  action: z.string().min(1),
  role: z.string().optional(),
  tools: z.array(z.string()).optional(),
});
export type PolicyConfig = z.infer<typeof policySchema>;

export const workflowStepSchema = z.object({
  step_id: z.string().min(1),
  action: z.string().min(1),
  policy_ref: z.string().optional(),
  condition: z.string().optional(),
  role_ref: z.string().optional(),
});
export type WorkflowStepConfig = z.infer<typeof workflowStepSchema>;

export const workflowSchema = z.object({
  name: z.string().min(1),
  trigger: z.string().min(1),
  steps: z.array(workflowStepSchema).min(1),
});
export type WorkflowDefinition = z.infer<typeof workflowSchema>;

export const dnaSchema = z.object({
  version: z.string().default('1.0'),
  domain: z.string().min(1),
  entities: z.array(entitySchema).default([]),
  policies: z.array(policySchema).default([]),
  workflows: z.array(workflowSchema).default([]),
});
export type DnaConfig = z.infer<typeof dnaSchema>;

// ---------------------------------------------------------------------------
// Compiled / AST output (strongly typed, no `any`)
// ---------------------------------------------------------------------------

export interface EntityNode {
  type: 'Entity';
  id: string;
  payload: EntityConfig;
}

export interface PolicyNode {
  type: 'Policy';
  id: string;
  payload: PolicyConfig;
}

export interface WorkflowNode {
  type: 'Workflow';
  id: string;
  payload: WorkflowDefinition;
}

export type ASTNode = EntityNode | PolicyNode | WorkflowNode;

export interface BusinessSemanticAST {
  version: string;
  domain: string;
  nodes: ASTNode[];
}

// ---------------------------------------------------------------------------
// Loading & validation
// ---------------------------------------------------------------------------

function validateReferences(dna: DnaConfig): void {
  const policyIds = new Set(dna.policies.map((p) => p.id));
  for (const wf of dna.workflows) {
    for (const step of wf.steps) {
      if (step.policy_ref && !policyIds.has(step.policy_ref)) {
        throw new Error(
          `Invalid Enterprise DNA: workflow "${wf.name}" step "${step.step_id}" references unknown policy "${step.policy_ref}"`,
        );
      }
    }
  }
}

export function parseDna(yamlContent: string): DnaConfig {
  const raw = yaml.load(yamlContent) as unknown;
  const parsed = dnaSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid Enterprise DNA: ${issues}`);
  }
  validateReferences(parsed.data);
  return parsed.data;
}

export function loadDna(yamlFilePath: string): DnaConfig {
  const content = fs.readFileSync(yamlFilePath, 'utf8');
  return parseDna(content);
}

export class Compiler {
  /**
   * Loads, validates and compiles an Enterprise DNA file into a strongly
   * typed Business Semantic AST. Invalid configuration throws instead of
   * being passed through silently.
   */
  public compile(yamlFilePath: string): BusinessSemanticAST {
    const dna = loadDna(yamlFilePath);

    const nodes: ASTNode[] = [
      ...dna.entities.map(
        (e): EntityNode => ({ type: 'Entity', id: `entity_${e.name.toLowerCase()}`, payload: e }),
      ),
      ...dna.policies.map(
        (p): PolicyNode => ({ type: 'Policy', id: p.id, payload: p }),
      ),
      ...dna.workflows.map(
        (w): WorkflowNode => ({ type: 'Workflow', id: `wf_${w.name.toLowerCase()}`, payload: w }),
      ),
    ];

    return { version: dna.version, domain: dna.domain, nodes };
  }
}