import { describe, it, expect } from 'vitest';
import { WorkflowRouter } from './router';
import type { WorkflowContext, WorkflowNode, WorkflowEdge } from './types';

function buildContext(
  currentNodeId: string,
  formData: Record<string, unknown>,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): WorkflowContext {
  return {
    instanceId: 'i1',
    definitionId: 'd1',
    versionId: 'v1',
    initiatorId: null,
    formData,
    variables: {},
    currentNodeId,
    nodes,
    edges,
  };
}

const nodes: WorkflowNode[] = [
  { id: 'start', type: 'input' },
  { id: 'gate', type: 'gateway' },
  { id: 'manual', type: 'approval' },
  { id: 'auto', type: 'approval' },
];

const edges: WorkflowEdge[] = [
  { id: 'e1', source: 'start', target: 'gate' },
  {
    id: 'e2',
    source: 'gate',
    target: 'manual',
    data: { condition: { expression: '{{form.amount}} > 500' } },
  },
  {
    id: 'e3',
    source: 'gate',
    target: 'auto',
    data: { condition: { expression: 'default' } },
  },
];

describe('WorkflowRouter', () => {
  it('routes over the threshold to manual approval', () => {
    const ctx = buildContext('gate', { amount: 600 }, nodes, edges);
    expect(WorkflowRouter.route(ctx)).toEqual(['manual']);
  });

  it('routes under the threshold to auto approval via default edge', () => {
    const ctx = buildContext('gate', { amount: 300 }, nodes, edges);
    expect(WorkflowRouter.route(ctx)).toEqual(['auto']);
  });

  it('passes through non-gateway nodes to all outgoing targets', () => {
    const ctx = buildContext('start', {}, nodes, edges);
    expect(WorkflowRouter.route(ctx)).toEqual(['gate']);
  });

  it('throws when no gateway condition matches and no default is defined', () => {
    const noDefault: WorkflowEdge[] = [
      { id: 'x1', source: 'gate', target: 'manual', data: { condition: { expression: '{{form.amount}} > 500' } } },
    ];
    const ctx = buildContext('gate', { amount: 100 }, nodes, noDefault);
    expect(() => WorkflowRouter.route(ctx)).toThrow(/No matching conditions/);
  });

  it('evaluates string equality conditions', () => {
    expect(WorkflowRouter.evaluateCondition('{{form.status}} == approved', { status: 'approved' })).toBe(true);
    expect(WorkflowRouter.evaluateCondition('{{form.status}} == approved', { status: 'rejected' })).toBe(false);
  });

  it('rejects malformed condition expressions explicitly', () => {
    expect(() => WorkflowRouter.evaluateCondition('amount > 500', { amount: 600 })).toThrow();
  });
});