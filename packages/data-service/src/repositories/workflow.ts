import { prisma } from '../index';

const instanceInclude = {
  tasks: true,
  version: { select: { version: true, definition: { select: { name: true } } } },
} as const;

export const workflowRepository = {
  // --- Definitions ---
  async listDefinitions() {
    return prisma.workflowDefinition.findMany({ orderBy: { createdAt: 'desc' } });
  },

  async saveDefinition(data: { id?: string; name: string; nodes: unknown; edges: unknown; isActive: boolean }) {
    if (data.id) {
      return prisma.workflowDefinition.update({
        where: { id: data.id },
        data: { nodes: data.nodes as object, edges: data.edges as object, isActive: data.isActive },
      });
    }
    return prisma.workflowDefinition.create({
      data: {
        code: `WF-${Date.now()}`,
        name: data.name,
        nodes: data.nodes as object,
        edges: data.edges as object,
        isActive: true,
      },
    });
  },

  // --- Versions ---
  async findLatestPublishedVersion(definitionId: string) {
    return prisma.workflowVersion.findFirst({
      where: { definitionId, isPublished: true },
      orderBy: { version: 'desc' },
    });
  },

  // --- Instances ---
  async createInstance(versionId: string, initiatorId: string | null, formData: Record<string, unknown>, currentNodes: string[]) {
    return prisma.processInstance.create({
      data: {
        versionId,
        initiatorId,
        formData: formData as object,
        currentNodes,
        status: 'RUNNING',
      },
    });
  },

  async updateInstanceNodes(id: string, currentNodes: string[]) {
    return prisma.processInstance.update({ where: { id }, data: { currentNodes } });
  },

  async completeInstance(id: string) {
    return prisma.processInstance.update({
      where: { id },
      data: { status: 'COMPLETED', endedAt: new Date() },
    });
  },

  async rejectInstance(id: string) {
    return prisma.processInstance.update({
      where: { id },
      data: { status: 'REJECTED', endedAt: new Date() },
    });
  },

  async findInstance(id: string) {
    return prisma.processInstance.findUnique({
      where: { id },
      include: { version: true },
    });
  },

  async listInstances(initiatorId?: string | null) {
    return prisma.processInstance.findMany({
      where: initiatorId ? { initiatorId } : {},
      include: instanceInclude,
      orderBy: { startedAt: 'desc' },
    });
  },

  // --- Tasks ---
  async createTask(data: {
    instanceId: string;
    nodeId: string;
    nodeName: string;
    taskType?: string;
    assigneeId?: string | null;
    candidateGroup?: string | null;
  }) {
    return prisma.processTask.create({
      data: {
        instanceId: data.instanceId,
        nodeId: data.nodeId,
        nodeName: data.nodeName,
        taskType: data.taskType ?? 'APPROVAL',
        assigneeId: data.assigneeId ?? null,
        candidateGroup: data.candidateGroup ?? null,
        status: 'PENDING',
      },
    });
  },

  async findTaskWithInstance(id: string) {
    return prisma.processTask.findUnique({
      where: { id },
      include: { instance: { include: { version: true } } },
    });
  },

  async listPendingTasks(assigneeId?: string | null) {
    return prisma.processTask.findMany({
      where: assigneeId ? { assigneeId, status: 'PENDING' } : { status: 'PENDING' },
      include: {
        instance: {
          select: {
            formData: true,
            initiatorId: true,
            version: { select: { definition: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Completes a task and writes its log atomically.
   */
  async completeTaskAndLog(params: {
    taskId: string;
    operatorId: string;
    newStatus: string;
    actionLabel: string;
    comment?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.processTask.update({
        where: { id: params.taskId },
        data: { status: params.newStatus, completedAt: new Date(), assigneeId: params.operatorId },
      });
      return tx.processLog.create({
        data: {
          instanceId: (await tx.processTask.findUniqueOrThrow({ where: { id: params.taskId } })).instanceId,
          taskId: params.taskId,
          actionType: params.actionLabel,
          operatorId: params.operatorId,
          details: params.comment || `Task ${params.actionLabel}`,
        },
      });
    });
  },

  // --- Logs ---
  async createLog(data: {
    instanceId: string;
    taskId?: string | null;
    actionType: string;
    operatorId?: string | null;
    details?: string;
  }) {
    return prisma.processLog.create({
      data: {
        instanceId: data.instanceId,
        taskId: data.taskId ?? null,
        actionType: data.actionType,
        operatorId: data.operatorId ?? null,
        details: data.details ?? null,
      },
    });
  },
};