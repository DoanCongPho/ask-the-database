import { useEffect, useState } from "react";
import { Database, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getSchema } from "@/lib/api";
import type { SchemaResponse } from "@/lib/types";

export function SchemaSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [data, setData] = useState<SchemaResponse | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (!open || data) return;
    setErr(false);
    getSchema()
      .then(setData)
      .catch(() => setErr(true));
  }, [open, data]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Database className="size-5 text-primary" /> Dữ liệu cửa hàng
          </SheetTitle>
          <SheetDescription>
            Đây là những thông tin tôi dùng để trả lời câu hỏi của bạn.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          {!data && !err && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Đang tải…
            </div>
          )}
          {err && (
            <p className="rounded-xl bg-destructive-soft p-4 text-sm text-destructive">
              Chưa kết nối được máy chủ để tải phần này.
            </p>
          )}
          {data?.tables.map((t) => (
            <section key={t.name} className="rounded-2xl border bg-card p-4">
              <h3 className="font-semibold">{t.description}</h3>
              <p className="mb-3 font-mono text-xs text-muted-foreground">{t.name}</p>
              <ul className="space-y-1.5 text-sm">
                {t.columns.map((c) => (
                  <li key={c.name} className="flex justify-between gap-3">
                    <span className="font-mono text-xs">{c.name}</span>
                    <span className="text-right">{c.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
