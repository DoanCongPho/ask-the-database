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
import { useI18n } from "@/lib/i18n";
import type { SchemaResponse } from "@/lib/types";

export function SchemaSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { t, lang } = useI18n();
  const [data, setData] = useState<SchemaResponse | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => setData(null), [lang]);
  useEffect(() => {
    if (!open || data) return;
    setErr(false);
    getSchema(lang)
      .then(setData)
      .catch(() => setErr(true));
  }, [open, data, lang]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Database className="size-5 text-primary" /> {t("shopData")}
          </SheetTitle>
          <SheetDescription>{t("schemaIntro")}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          {!data && !err && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t("loadingDots")}
            </div>
          )}
          {err && (
            <p className="rounded-xl bg-destructive-soft p-4 text-sm text-destructive">
              {t("schemaError")}
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
