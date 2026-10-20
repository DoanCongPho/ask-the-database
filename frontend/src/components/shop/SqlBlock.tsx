import { useState, type ReactNode } from "react";
import { Check, ChevronDown, Code2, Copy, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { AskResponse } from "@/lib/types";

const KW =
  /^(select|from|where|and|or|not|join|left|right|inner|outer|full|on|group|by|order|having|limit|offset|as|asc|desc|with|case|when|then|else|end|in|is|null|between|like|ilike|distinct|union|all|count|sum|avg|min|max|extract|year|date_trunc|coalesce|using|interval)$/i;

export function highlightSql(sql: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /('(?:[^']|'')*')|(\b\d+(?:\.\d+)?\b)|(\b[a-z_]+\b)|(--[^\n]*)|([\s\S])/gi;
  let m: RegExpExecArray | null;
  let k = 0;
  let buf = "";
  const flush = () => {
    if (buf) {
      out.push(buf);
      buf = "";
    }
  };
  while ((m = re.exec(sql))) {
    if (m[1]) {
      flush();
      out.push(
        <span key={k++} className="text-code-string">
          {m[1]}
        </span>,
      );
    } else if (m[2]) {
      flush();
      out.push(
        <span key={k++} className="text-code-number">
          {m[2]}
        </span>,
      );
    } else if (m[3] && KW.test(m[3])) {
      flush();
      out.push(
        <span key={k++} className="font-semibold text-code-keyword">
          {m[3]}
        </span>,
      );
    } else if (m[4]) {
      flush();
      out.push(
        <span key={k++} className="italic text-muted-foreground">
          {m[4]}
        </span>,
      );
    } else buf += m[0];
  }
  flush();
  return out;
}

export function CodeView({ sql }: { sql: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-code-bg p-4 font-mono text-[13px] leading-relaxed">
      {highlightSql(sql)}
    </pre>
  );
}

function CopyBtn({ text, label = "Sao chép" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* ignore */
        }
      }}
    >
      {done ? <Check /> : <Copy />} {done ? "Đã sao chép" : label}
    </Button>
  );
}

export function SqlBlock({
  data,
  label = "Xem truy vấn SQL",
}: {
  data: AskResponse;
  label?: string;
}) {
  if (!data.sql) return null;
  const failed = (data.attempts ?? []).filter((a) => a.error);
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <Code2 className="size-4" /> {label}
        <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-3">
        <CodeView sql={data.sql} />
        <CopyBtn text={data.sql} />
        {(data.attempts?.length ?? 0) > 1 && (
          <Collapsible>
            <CollapsibleTrigger className="group flex items-center gap-2 text-sm text-warning">
              <Wrench className="size-4" /> Đã tự sửa sau {data.attempts!.length} lần thử
              <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-3">
              {failed.map((a, i) => (
                <div key={i} className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Lần thử {i + 1}</p>
                  <CodeView sql={a.sql} />
                  <p className="rounded-lg bg-destructive-soft px-3 py-2 font-mono text-xs text-destructive">
                    {a.error}
                  </p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export { CopyBtn };
