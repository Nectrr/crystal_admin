"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from "lucide-react";
import { Table, THead, TBody, TH, TD, TR, EmptyState, TableSkeleton } from "@/components/ui/Table";

export interface DataTableColumn<T> {
  /** Unique key for the column, also used as the React key / sort key. */
  key: string;
  header: string;
  /** Custom cell renderer. Falls back to `accessor(row)` (stringified) if omitted. */
  render?: (row: T) => ReactNode;
  /** Value getter used for sorting and the default search predicate. */
  accessor?: (row: T) => string | number | Date | null | undefined;
  /** Whether clicking the header toggles sorting on this column. Requires `accessor`. */
  sortable?: boolean;
  /** Whether this column's value is included in the default search predicate. */
  searchable?: boolean;
  className?: string;
  headerClassName?: string;
}

type SortDir = "asc" | "desc";

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  skeletonCols?: number;
  emptyTitle?: string;
  emptyMessage?: string;
  /** Show the built-in search box. Default true. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Override the default "search across `searchable` columns" behavior. */
  searchPredicate?: (row: T, query: string) => boolean;
  /** Enable client-side pagination. Default true. */
  paginate?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  /** Optional extra toolbar content rendered next to the search box (e.g. status filters). */
  toolbar?: ReactNode;
  /** When provided, rendered as `md:hidden` stacked cards; the table itself becomes `hidden md:block`. */
  renderMobileCard?: (row: T) => ReactNode;
  rowClassName?: (row: T) => string;
}

function defaultCompare(a: string | number | Date | null | undefined, b: string | number | Date | null | undefined) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a instanceof Date || b instanceof Date) {
    const at = a instanceof Date ? a.getTime() : new Date(a as string).getTime();
    const bt = b instanceof Date ? b.getTime() : new Date(b as string).getTime();
    return at - bt;
  }
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  skeletonRows = 6,
  skeletonCols,
  emptyTitle,
  emptyMessage = "No results found.",
  searchable = true,
  searchPlaceholder = "Search...",
  searchPredicate,
  paginate = true,
  pageSize = 10,
  pageSizeOptions,
  toolbar,
  renderMobileCard,
  rowClassName,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);

  const searchableColumns = useMemo(() => columns.filter((c) => c.searchable && c.accessor), [columns]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    if (searchPredicate) return rows.filter((r) => searchPredicate(r, q));
    if (searchableColumns.length === 0) return rows;
    return rows.filter((r) =>
      searchableColumns.some((c) => {
        const v = c.accessor!(r);
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [rows, query, searchPredicate, searchableColumns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.accessor) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const cmp = defaultCompare(col.accessor!(a), col.accessor!(b));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir, columns]);

  const pageCount = paginate ? Math.max(1, Math.ceil(sorted.length / size)) : 1;
  const currentPage = Math.min(page, pageCount);
  const paged = paginate ? sorted.slice((currentPage - 1) * size, currentPage * size) : sorted;

  function toggleSort(col: DataTableColumn<T>) {
    if (!col.sortable || !col.accessor) return;
    if (sortKey !== col.key) {
      setSortKey(col.key);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  }

  function handleQueryChange(v: string) {
    setQuery(v);
    setPage(1);
  }

  if (loading) {
    return <TableSkeleton rows={skeletonRows} cols={skeletonCols ?? columns.length} />;
  }

  const showToolbar = searchable || !!toolbar;

  return (
    <div className="flex flex-col gap-3">
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-3">
          {searchable && (
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C8C78]" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-[#EDEAE0] bg-white py-2 pl-9 pr-3 text-sm text-[#4A4A3C] focus:outline-none focus:ring-2 focus:ring-[#B8952F]/40 focus:border-[#B8952F]"
              />
            </div>
          )}
          {toolbar}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      ) : sorted.length === 0 ? (
        <EmptyState title="No matches" message="No rows match your search." />
      ) : (
        <>
          <div className={renderMobileCard ? "hidden md:block" : undefined}>
            <Table>
              <THead>
                <tr>
                  {columns.map((col) => (
                    <TH key={col.key}>
                      {col.sortable && col.accessor ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col)}
                          className="flex items-center gap-1 hover:text-[#B8952F]"
                        >
                          {col.header}
                          {sortKey === col.key ? (
                            sortDir === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </TH>
                  ))}
                </tr>
              </THead>
              <TBody>
                {paged.map((row) => (
                  <TR key={rowKey(row)} className={rowClassName?.(row)}>
                    {columns.map((col) => (
                      <TD key={col.key} className={col.className}>
                        {col.render ? col.render(row) : col.accessor ? String(col.accessor(row) ?? "") : null}
                      </TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {renderMobileCard && (
            <div className="flex flex-col gap-3 md:hidden">{paged.map((row) => renderMobileCard(row))}</div>
          )}

          {paginate && sorted.length > size && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#8C8C78]">
                {sorted.length} result{sorted.length === 1 ? "" : "s"} · page {currentPage} of {pageCount}
              </p>
              <div className="flex items-center gap-3">
                {pageSizeOptions && pageSizeOptions.length > 0 && (
                  <select
                    value={size}
                    onChange={(e) => {
                      setSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded-lg border border-[#EDEAE0] bg-white px-2 py-1.5 text-sm text-[#4A4A3C] focus:outline-none focus:ring-2 focus:ring-[#B8952F]/40"
                  >
                    {pageSizeOptions.map((n) => (
                      <option key={n} value={n}>
                        {n} / page
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-[#EDEAE0] bg-white px-3 py-1.5 text-sm text-[#4A4A3C] hover:bg-[#F5E9CE]/40 disabled:opacity-50 disabled:hover:bg-white"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    className="rounded-lg border border-[#EDEAE0] bg-white px-3 py-1.5 text-sm text-[#4A4A3C] hover:bg-[#F5E9CE]/40 disabled:opacity-50 disabled:hover:bg-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
