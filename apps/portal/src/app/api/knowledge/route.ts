import { NextResponse } from 'next/server';
import { knowledgeRepository, isKnowledgeCategory, KNOWLEDGE_STATUSES } from '@aios/data-service';
import { requireAuth, requirePermission, handleRouteError } from '@/lib/auth/guard';

const ALLOWED_STATUSES = KNOWLEDGE_STATUSES as readonly string[];

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? undefined;
    const category = searchParams.get('category') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const { items, total } = await knowledgeRepository.list({ q, category, status });
    return NextResponse.json({ items, total });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('KNOWLEDGE', 'WRITE');
    const body = await req.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    if (content.length < 20) {
      return NextResponse.json({ error: 'Content must be at least 20 characters' }, { status: 400 });
    }
    if (body.category && !isKnowledgeCategory(String(body.category).toUpperCase())) {
      return NextResponse.json({ error: `Invalid category: ${body.category}` }, { status: 400 });
    }
    if (body.status && !ALLOWED_STATUSES.includes(String(body.status).toUpperCase())) {
      return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 });
    }

    const article = await knowledgeRepository.create({
      title,
      category: body.category ?? 'HOWTO',
      content,
      summary: body.summary,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      status: body.status ?? 'DRAFT',
      authorId: body.authorId ?? null,
      authorName: body.authorName ?? null,
    });
    return NextResponse.json(article, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}