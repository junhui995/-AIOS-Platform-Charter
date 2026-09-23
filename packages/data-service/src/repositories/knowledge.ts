import { prisma } from '../index';
import type { KnowledgeArticle } from '@prisma/client';

export const KNOWLEDGE_CATEGORIES = ['POLICY', 'HR', 'FINANCE', 'PROCESS', 'HOWTO'] as const;
export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

export const KNOWLEDGE_STATUSES = ['DRAFT', 'PUBLISHED'] as const;

export interface KnowledgeListParams {
  q?: string;
  category?: string;
  status?: string;
}

export function isKnowledgeCategory(value: string): value is KnowledgeCategory {
  return (KNOWLEDGE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Knowledge base repository. Pure data access + minimal domain guards
 * (category whitelist, DRAFT/PUBLISHED transition). No events, no rules,
 * no permission layer (deferred until Identity/Permission pillar).
 */
export const knowledgeRepository = {
  async list(params: KnowledgeListParams = {}): Promise<{ items: KnowledgeArticle[]; total: number }> {
    const { q, category, status } = params;
    const where = {
      ...(category ? { category: category.toUpperCase() } : {}),
      ...(status ? { status: status.toUpperCase() } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { content: { contains: q } },
              { tags: { has: q } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.knowledgeArticle.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.knowledgeArticle.count({ where }),
    ]);
    return { items, total };
  },

  async get(id: string): Promise<KnowledgeArticle | null> {
    return prisma.knowledgeArticle.findUnique({ where: { id } });
  },

  async create(data: {
    title: string;
    category: string;
    content: string;
    summary?: string;
    tags?: string[];
    status?: string;
    authorId?: string | null;
    authorName?: string | null;
  }) {
    const category = data.category.toUpperCase();
    if (!isKnowledgeCategory(category)) {
      throw new Error(`Invalid article category: ${data.category}`);
    }
    const status = (data.status ?? 'DRAFT').toUpperCase();
    return prisma.knowledgeArticle.create({
      data: {
        title: data.title,
        category,
        summary: data.summary ?? null,
        content: data.content,
        tags: data.tags ?? [],
        status,
        authorId: data.authorId ?? null,
        authorName: data.authorName ?? null,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      },
    });
  },

  async update(
    id: string,
    data: {
      title?: string;
      category?: string;
      content?: string;
      summary?: string | null;
      tags?: string[];
      status?: string;
      authorName?: string | null;
    },
  ) {
    const existing = await prisma.knowledgeArticle.findUnique({ where: { id } });
    if (!existing) return null;

    let status = existing.status;
    if (data.status !== undefined) {
      status = data.status.toUpperCase();
      const allowed = status === 'DRAFT' || status === 'PUBLISHED';
      if (!allowed) throw new Error(`Invalid article status: ${data.status}`);
      if ((existing.status as string) === status) {
        throw new Error(`Article is already ${status === 'DRAFT' ? 'draft' : 'published'}`);
      }
    }
    let category = existing.category;
    if (data.category !== undefined) {
      category = data.category.toUpperCase();
      if (!isKnowledgeCategory(category)) throw new Error(`Invalid article category: ${data.category}`);
    }

    const firstPublish = status === 'PUBLISHED' && existing.publishedAt === null;
    return prisma.knowledgeArticle.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.category !== undefined ? { category } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.summary !== undefined ? { summary: data.summary } : {}),
        ...(data.authorName !== undefined ? { authorName: data.authorName } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        status,
        ...(firstPublish ? { publishedAt: new Date() } : {}),
      },
    });
  },

  async delete(id: string) {
    return prisma.knowledgeArticle.delete({ where: { id } });
  },

  async bumpView(id: string) {
    return prisma.knowledgeArticle.updateMany({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  },

  /** Idempotent demo seed: only runs when the table is empty. */
  async seedDemoArticles() {
    const count = await prisma.knowledgeArticle.count();
    if (count > 0) return [] as string[];

    const demo: Array<{
      title: string; category: string; summary: string; content: string;
      tags: string[]; status: string; authorName: string;
    }> = [
      {
        title: '员工考勤管理办法',
        category: 'POLICY',
        summary: '出勤、迟到、缺勤及异常考勤的处理口径。',
        content: `一、适用范围\n全体员工。\n\n二、出勤要求\n每日按排班正常打卡，异常考勤（迟到、早退、未经审批的缺勤）由考勤系统自动标注。\n\n三、异常处理\n1. 系统每日自动扫描异常考勤并触发预警；\n2. 直属上级应在预警产生后完成确认或提交说明；\n3. 连续异常将进入绩效与合规评估流程。\n\n四、审批口径\n确因公外出或突发情况无法打卡的，须在当日补交事由说明。`,
        tags: ['考勤', '制度'],
        status: 'PUBLISHED',
        authorName: 'HR Admin',
      },
      {
        title: '报销申请与审批流程',
        category: 'FINANCE',
        summary: '费用报销的填单、提交、审批与打款口径。',
        content: `一、可报销范围\n差旅、办公用品、业务招待等与工作直接相关的合理支出。\n\n二、提交流程\n1. 在「我的报销」中创建申请，填写金额与事由；\n2. 提交后流转至审批人；\n3. 审批通过后进入财务打款队列。\n\n三、注意事项\n1. 报销金额需与实际支出一致；\n2. 大额支出需附带说明；\n3. 被驳回的申请可修改后重新提交。`,
        tags: ['报销', '财务'],
        status: 'PUBLISHED',
        authorName: 'HR Admin',
      },
      {
        title: '请假申请操作指南',
        category: 'HOWTO',
        summary: '年假、事假的提交与审批操作步骤。',
        content: `一、入口\n左侧菜单「我的假期」。\n\n二、提交请假\n1. 选择请假类型（年假/事假）并填写起止日期；\n2. 系统自动校验剩余额度；\n3. 提交后由审批人完成通过/驳回。\n\n三、查看结果\n审批结果将通过「消息中心」通知本人；剩余额度在首页实时展示。`,
        tags: ['请假', '自助'],
        status: 'PUBLISHED',
        authorName: 'HR Admin',
      },
    ];

    const created = [];
    for (const d of demo) {
      await prisma.knowledgeArticle.create({
        data: {
          title: d.title,
          category: d.category,
          summary: d.summary,
          content: d.content,
          tags: d.tags,
          status: d.status,
          publishedAt: new Date(),
          authorName: d.authorName,
        },
      });
      created.push(d.title);
    }
    return created;
  },
};