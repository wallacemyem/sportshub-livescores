'use client';

import { useMemo, useState, useEffect } from 'react';
import { ArrowUpDown, ArrowDown, ArrowUp, Search, X, Inbox } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';

export interface Column<T> {
  /** Stable key, also used as the sort key. */
  key: string;
  header: string;
  /** Cell renderer. */
  cell: (row: T) => React.ReactNode;
  /** Value used for sorting. Omit to make the column unsortable. */
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right';
  /** Hide below this breakpoint so narrow screens keep the important columns. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  /** Fixed width, e.g. "w-32". */
  width?: string;
}

export interface FilterGroup {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Fields concatenated for the search box. */
  searchFields?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: FilterGroup[];
  /** Returns the row's value for a given filter group. */
  filterValue?: (row: T, key: string) => string;
  onRowClick?: (row: T) => void;
  isSelected?: (row: T) => boolean;
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  pageSize?: number;
  itemLabel?: string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  /** Minimum table width before the container scrolls horizontally. */
  minWidth?: string;
  /** Rendered on the right of the toolbar. */
  toolbarActions?: React.ReactNode;
}

const HIDE_BELOW: Record<string, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

/**
 * One table for the whole console.
 *
 * Search, filtering, sorting and pagination used to be re-implemented per tab,
 * with slightly different behaviour each time (and page indexes that did not
 * reset when a filter changed). Everything routes through here now.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchFields,
  searchPlaceholder = 'Search...',
  filters = [],
  filterValue,
  onRowClick,
  isSelected,
  defaultSort,
  pageSize: initialPageSize = 10,
  itemLabel = 'rows',
  isLoading = false,
  emptyTitle = 'Nothing to show',
  emptyBody = 'No records match the current view.',
  minWidth = 'min-w-[820px]',
  toolbarActions,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(
    defaultSort ?? null
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtered = useMemo(() => {
    let out = rows;

    const q = query.trim().toLowerCase();
    if (q && searchFields) {
      out = out.filter((row) => searchFields(row).toLowerCase().includes(q));
    }

    for (const [key, value] of Object.entries(activeFilters)) {
      if (!value || value === 'all' || !filterValue) continue;
      out = out.filter((row) => filterValue(row, key) === value);
    }

    if (sort) {
      const column = columns.find((c) => c.key === sort.key);
      if (column?.sortValue) {
        const { sortValue } = column;
        out = [...out].sort((a, b) => {
          const av = sortValue(a);
          const bv = sortValue(b);
          if (av === bv) return 0;
          const cmp = av > bv ? 1 : -1;
          return sort.dir === 'asc' ? cmp : -cmp;
        });
      }
    }

    return out;
  }, [rows, query, activeFilters, sort, columns, searchFields, filterValue]);

  // Any change to the result set sends you back to page 1; leaving the index
  // where it was is how you end up staring at an empty page after filtering.
  useEffect(() => {
    setPage(1);
  }, [query, activeFilters, pageSize, rows.length]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (current?.key !== key) return { key, dir: 'desc' };
      return { key, dir: current.dir === 'desc' ? 'asc' : 'desc' };
    });
  };

  const hasToolbar = Boolean(searchFields) || filters.length > 0 || Boolean(toolbarActions);

  return (
    <div className="space-y-3">
      {hasToolbar && (
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {searchFields && (
              <div className="relative min-w-0 flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="w-full rounded-lg border border-surface-border bg-surface-subtle py-2 pl-9 pr-8 text-xs text-foreground transition-colors placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {filters.map((group) => (
              <label key={group.key} className="flex shrink-0 items-center gap-1.5">
                <span className="sr-only">{group.label}</span>
                <select
                  value={activeFilters[group.key] ?? 'all'}
                  onChange={(e) =>
                    setActiveFilters((prev) => ({ ...prev, [group.key]: e.target.value }))
                  }
                  className="cursor-pointer rounded-lg border border-surface-border bg-surface-subtle px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">{group.label}: all</option>
                  {group.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {group.label}: {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {toolbarActions && <div className="flex shrink-0 items-center gap-2">{toolbarActions}</div>}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface">
        <div className="overflow-x-auto">
          <table className={`w-full ${minWidth} border-collapse text-left`}>
            <thead>
              <tr className="border-b border-surface-border bg-surface-subtle/70">
                {columns.map((col) => {
                  const sortable = Boolean(col.sortValue);
                  const isSorted = sort?.key === col.key;
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={
                        isSorted ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined
                      }
                      className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground ${
                        col.align === 'right' ? 'text-right' : 'text-left'
                      } ${col.width ?? ''} ${col.hideBelow ? HIDE_BELOW[col.hideBelow] : ''}`}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className={`inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground ${
                            col.align === 'right' ? 'flex-row-reverse' : ''
                          } ${isSorted ? 'text-foreground' : ''}`}
                        >
                          <span>{col.header}</span>
                          {isSorted ? (
                            sort!.dir === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-b border-surface-border last:border-0">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 ${
                          col.hideBelow ? HIDE_BELOW[col.hideBelow] : ''
                        }`}
                      >
                        <span className="block h-3 w-full max-w-[120px] animate-pulse rounded bg-surface-hover" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-14 text-center">
                    <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-surface-border bg-surface-subtle text-muted-foreground">
                      <Inbox className="h-5 w-5" />
                    </span>
                    <p className="mt-3.5 text-sm font-bold text-foreground">{emptyTitle}</p>
                    <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                      {emptyBody}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((row) => {
                  const selected = isSelected?.(row) ?? false;
                  return (
                    <tr
                      key={rowKey(row)}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      onKeyDown={
                        onRowClick
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onRowClick(row);
                              }
                            }
                          : undefined
                      }
                      className={`border-b border-surface-border transition-colors last:border-0 ${
                        onRowClick ? 'cursor-pointer' : ''
                      } ${
                        selected
                          ? 'bg-[var(--brand-soft)]'
                          : onRowClick
                            ? 'hover:bg-surface-subtle'
                            : ''
                      }`}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 align-middle text-xs ${
                            col.align === 'right' ? 'text-right' : 'text-left'
                          } ${col.hideBelow ? HIDE_BELOW[col.hideBelow] : ''}`}
                        >
                          {col.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filtered.length > 0 && (
          <div className="border-t border-surface-border px-2 py-1">
            <Pagination
              currentPage={page}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel={itemLabel}
            />
          </div>
        )}
      </div>
    </div>
  );
}
