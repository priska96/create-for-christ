import type { InfiniteData } from '@tanstack/react-query';
export type ItemPages<T> = InfiniteData<
  { items: T[]; nextCursor: string | null },
  string | undefined
>;
export function mapPages<T>(
  data: ItemPages<T> | undefined,
  update: (items: T[]) => T[]
): ItemPages<T> | undefined {
  return data
    ? {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: update(page.items),
        })),
      }
    : data;
}
