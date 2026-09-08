import { Link, useSearch } from "@tanstack/react-router"
import { clsx } from "clsx"
import { getPaginationRange, PAGE_SIZE } from "../utils/pagination.ts"

type PaginationProps = {
  total?: number
  limit?: number
}

export default function Pagination({ total = 0, limit = PAGE_SIZE }: PaginationProps) {
  const totalPages = Math.ceil(total / limit)
  const search = useSearch({ strict: false })

  const currentPage = search.page ?? 1

  if (totalPages <= 1) {
    return null
  }

  const items = getPaginationRange(currentPage, totalPages)

  return (
    <ul className="pagination">
      {items.map((item, index) => {
        if (item === "...") {
          return (
            <li key={`ellipsis-${index}`} className="page-item disabled">
              <span className="page-link">&hellip;</span>
            </li>
          )
        }
        return (
          <li key={item} className={clsx("page-item", item === search.page && "active")}>
            <Link to="." search={(prev) => ({ ...prev, page: item })} className="page-link">
              {item}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
