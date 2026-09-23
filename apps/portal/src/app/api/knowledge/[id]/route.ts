import { NextResponse } from 'next/server';
import { knowledgeRepository, isKnowledgeCategory, KNOWLEDGE_STATUSES } from '@aios/data-service';

const ALLOWED_STATUSES = KNOWLEDGE_STATUSES as readonly string[];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const article = await knowledgeRepository.get(id);
    if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    await knowledgeRepository.bumpView(id);
    return NextResponse.json({ ...article, viewCount: article.viewCount + 1 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch article';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (body.category && !isKnowledgeCategory(String(body.category).toUpperCase())) {
      return NextResponse.json({ error: `Invalid category: ${body.category}` }, { status: 400 });
    }
    if (body.status && !ALLOWED_STATUSES.includes(String(body.status).toUpperCase())) {
      return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 });
    }

    const updated = await knowledgeRepository.update(id, {
      title: typeof body.title === 'string' ? body.title.trim() : undefined,
      category: body.category !== undefined ? body.category : undefined,
      content: typeof body.content === 'string' ? body.content.trim() : undefined,
      summary: body.summary ?? undefined,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
      status: body.status !== undefined ? body.status : undefined,
      authorName: body.authorName ?? undefined,
    });
    if (!updated) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update article';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await knowledgeRepository.get(id);
    if (!existing) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    await knowledgeRepository.delete(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to delete article';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}