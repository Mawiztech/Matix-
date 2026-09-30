import { TableSkeleton } from "./AsyncStates";

/**
 * columns: [{ key, header, render?(row), className? }]
 * rows: array of data objects
 * mobileCard(row): optional custom mobile card renderer; defaults to stacking columns
 */
export default function DataTable({ columns, rows, loading, mobileCard, keyField = "id" }) {
  if (loading) return <TableSkeleton cols={columns.length} />;

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto scrollbar-thin -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/70">
              {columns.map((col) => (
                <th key={col.key} className="text-left font-display font-semibold text-xs text-ink-500 px-3 py-3 whitespace-nowrap">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[keyField]} className="border-b border-ink-100 last:border-0 row-glow transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-3 align-middle ${col.className || "text-ink-800"}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.map((row) =>
          mobileCard ? (
            <div key={row[keyField]}>{mobileCard(row)}</div>
          ) : (
            <div key={row[keyField]} className="border border-ink-200 rounded-card p-3.5 bg-white card-glow">
              {columns.map((col) => (
                <div key={col.key} className="flex justify-between items-start gap-3 py-1 text-sm">
                  <span className="text-xs font-medium text-ink-400 shrink-0">{col.header}</span>
                  <span className="text-ink-800 text-right">{col.render ? col.render(row) : row[col.key]}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </>
  );
}
