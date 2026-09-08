import { isDefined } from "./object.ts"

export const PAGE_SIZE = 10

export function getOffset(page?: number, pageSize: number = PAGE_SIZE): number {
  return isDefined(page) ? (page - 1) * pageSize : 0
}

export function getLimitOffset(page?: number, pageSize: number = PAGE_SIZE) {
  return {
    limit: pageSize,
    offset: isDefined(page) ? (page - 1) * pageSize : 0,
  }
}

const MAX_PAGES = 10

export function getPaginationRange(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= MAX_PAGES) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  // Near the start: [1, 2, 3, 4, 5, 6, 7, 8, '...', 55]
  if (currentPage <= 5) {
    const leftRange = Array.from({ length: 8 }, (_, i) => i + 1)
    return [...leftRange, "...", totalPages]
  }

  // Near the end: [1, '...', 48, 49, 50, 51, 52, 53, 54, 55]
  if (currentPage >= totalPages - 4) {
    const rightRange = Array.from({ length: 8 }, (_, i) => totalPages - 7 + i)
    return [1, "...", ...rightRange]
  }

  // Middle window: [1, '...', 18, 19, 20, 21, 22, 23, '...', 55]
  const middleRange = Array.from({ length: 6 }, (_, i) => currentPage - 2 + i)
  return [1, "...", ...middleRange, "...", totalPages]
}
