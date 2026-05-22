import { GospelVerse } from '../../models/gospelVerse';
import { paginatedFind, findByIdLean } from './paginatedList.repository';

export async function listAdminGospelVerseRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}) {
  return paginatedFind(GospelVerse, options);
}

export async function findAdminGospelVerseById(id: string) {
  return findByIdLean(GospelVerse, id);
}
