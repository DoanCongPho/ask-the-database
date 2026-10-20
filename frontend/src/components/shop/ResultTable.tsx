import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCell, headerOf } from "@/lib/format";
import type { AskResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

type Row = (string | number | null)[];
const PAGE = 50;

export function ResultTable({ data }: { data: AskResponse }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo<ColumnDef<Row>[]>(
    () =>
      data.columns.map((c, i) => ({
        id: String(i),
        accessorFn: (r) => r[i],
        header: headerOf(c),
        sortUndefined: "last",
        sortingFn: (a, b) => {
          const x = a.original[i],
            y = b.original[i];
          if (x === null) return 1;
          if (y === null) return -1;
          return typeof x === "number" && typeof y === "number"
            ? x - y
            : String(x).localeCompare(String(y), "vi");
        },
        meta: { type: c.type },
      })),
    [data.columns],
  );
  const table = useReactTable({
    data: data.rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE } },
  });
  const pages = table.getPageCount();
  const { pageIndex } = table.getState().pagination;

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="max-h-[480px] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const type = data.columns[Number(h.column.id)]!.type;
                  const right = type === "money" || type === "number";
                  const s = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      className={cn(
                        "whitespace-nowrap border-b px-3 py-2.5 font-semibold text-muted-foreground",
                        right ? "text-right" : "text-left",
                      )}
                    >
                      <button
                        onClick={h.column.getToggleSortingHandler()}
                        className={cn(
                          "inline-flex items-center gap-1 hover:text-foreground",
                          right && "flex-row-reverse",
                        )}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {s === "asc" ? (
                          <ArrowUp className="size-3.5" />
                        ) : s === "desc" ? (
                          <ArrowDown className="size-3.5" />
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-40" />
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r, ri) => (
              <tr key={r.id} className={cn(ri % 2 === 1 && "bg-zebra")}>
                {r.getVisibleCells().map((cell) => {
                  const type = data.columns[Number(cell.column.id)]!.type;
                  const v = formatCell(cell.getValue() as Row[number], type);
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        "whitespace-nowrap px-3 py-2",
                        (type === "money" || type === "number") && "text-right tabular-nums",
                      )}
                    >
                      {v === null ? <span className="text-muted-foreground">—</span> : v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-sm text-muted-foreground">
          <span>
            Trang {pageIndex + 1}/{pages}
          </span>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Trang trước"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeft />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Trang sau"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
