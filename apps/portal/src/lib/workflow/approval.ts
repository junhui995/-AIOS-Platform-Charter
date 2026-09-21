import type { WorkflowEdge, WorkflowNode } from './types';
import { WorkflowEngine } from './engine';
import { workflowRepository, employeeRepository } from '@aios/data-service';

export const APPROVAL_DEFINITIONS = {
  LEAVE: 'WF-LEAVE-APPROVAL',
  EXPENSE: 'WF-EXPENSE-APPROVAL',
} as const;

export type ApprovalKind = keyof typeof APPROVAL_DEFINITIONS;

const approvalNodes: WorkflowNode[] = [
  { id: 'input', type: 'input', position: { x: 80, y: 160 }, data: { label: '提交申请' } },
  { id: 'approve', type: 'approval', position: { x: 300, y: 160 }, data: { label: '部门审批', assigneeStrategy: 'FORM_VARIABLE' } },
  { id: 'out', type: 'output', position: { x: 520, y: 160 }, data: { label: '归档结案' } },
];

const approvalEdges: WorkflowEdge[] = [
  { id: 'e1', source: 'input', target: 'approve' },
  { id: 'e2', source: 'approve', target: 'out' },
];

/** Idempotently seed a built-in single-step approval flow definition. */
export async function ensureApprovalDefinition(kind: ApprovalKind) {
  const code = APPROVAL_DEFINITIONS[kind];
  const name =
    kind === 'LEAVE' ? '请假审批流程' : '报销审批流程';

  return workflowRepository.findOrCreateDefinition({
    code,
    name,
    nodes: approvalNodes,
    edges: approvalEdges,
  });
}

/** Resolve the system approver (admin employee EMP-000) at runtime. */
export async function resolveApprover(): Promise<string> {
  const admin = await employeeRepository.findByCode('EMP-000');
  if (admin) return admin.id;

  const fallback = await employeeRepository.listAll();
  const first = fallback[0];
  if (!first) throw new Error('No approver available: employee table is empty');
  return first.id;
}

/**
 * Start an approval flow for a domain record (leave / expense).
 * The domain record id is embedded in formData so the approval APIs can
 * find the running instance back via findInstanceByFormField.
 */
export async function startApprovalProcess(params: {
  kind: ApprovalKind;
  initiatorId: string;
  domainId: string;
  formData: Record<string, unknown>;
}) {
  const definition = await ensureApprovalDefinition(params.kind);
  const approverId = await resolveApprover();

  const instance = await WorkflowEngine.start({
    definitionId: definition.id,
    initiatorId: params.initiatorId,
    formData: { ...params.formData, [params.kind === 'LEAVE' ? 'leaveRequestId' : 'expenseId']: params.domainId, approverId },
  });

  return instance;
}

/** Complete the pending approval task of an instance. */
export async function completeApprovalTask(params: {
  instanceId: string;
  operatorId: string;
  action: 'APPROVE' | 'REJECT';
  comment?: string;
}) {
  const task = await workflowRepository.findPendingTaskByInstance(params.instanceId);
  if (!task) throw new Error('No pending approval task found for this instance');

  await WorkflowEngine.completeTask({
    taskId: task.id,
    operatorId: params.operatorId,
    action: params.action,
    comment: params.comment,
  });

  return task;
}