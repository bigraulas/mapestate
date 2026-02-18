import React from 'react';
import { Loader2 } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  renderExpandedRow?: (row: T) => React.ReactNode | null;
}

export default function DataTable<T extends { id?: number | string }>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Nu exista date.',
  onRowClick,
  renderExpandedRow,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Se incarca...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((row, rowIndex) => {
            const expanded = renderExpandedRow?.(row);
            return (
              <React.Fragment key={row.id ?? rowIndex}>
                <tr
                  onClick={() => onRowClick?.(row)}
                  className={
                    onRowClick
                      ? 'hover:bg-slate-50 cursor-pointer transition-colors'
                      : 'hover:bg-slate-50 transition-colors'
                  }
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-slate-700">
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
                {expanded && (
                  <tr>
                    <td colSpan={columns.length} className="p-0">
                      {expanded}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
