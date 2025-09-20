import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';

export type ContentItem = {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
};

const db = localforage.createInstance({ name: 'exo-cms' });

const CONTENT_INDEX_KEY = 'content:index';

export async function listContent(): Promise<ContentItem[]> {
  const items = (await db.getItem<ContentItem[]>(CONTENT_INDEX_KEY)) || [];
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function upsertContent(item: Partial<ContentItem> & { title: string; body: string }): Promise<ContentItem> {
  const all = await listContent();
  const now = Date.now();
  let saved: ContentItem;
  if (item.id) {
    const idx = all.findIndex(i => i.id === item.id);
    saved = { id: item.id, title: item.title, body: item.body, updatedAt: now } as ContentItem;
    if (idx >= 0) all[idx] = saved; else all.push(saved);
  } else {
    saved = { id: uuidv4(), title: item.title, body: item.body, updatedAt: now };
    all.push(saved);
  }
  await db.setItem(CONTENT_INDEX_KEY, all);
  return saved;
}

export async function deleteContent(id: string): Promise<void> {
  const all = await listContent();
  const filtered = all.filter(i => i.id !== id);
  await db.setItem(CONTENT_INDEX_KEY, filtered);
}


