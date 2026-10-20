import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  Clock,
  Download,
  HelpCircle,
  Inbox,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  Split,
  ShieldAlert,
  Table2,
  WifiOff,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ResultTable } from "./ResultTable";
import { ResultChart } from "./ResultChart";
import { ReasoningSteps } from "./ReasoningSteps";
import { CodeView, CopyBtn, SqlBlock } from "./SqlBlock";
import { downloadCsv, toTsv } from "@/lib/format";
import type { AskResponse } from "@/lib/types";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type Turn = {
  id: string;
  /** Conversation this turn belongs to; only turns of the open conversation are sent as context. */
  convId: string;
  question: string;
  at: number;
  state: "loading" | "done" | "network";
  response?: AskResponse | undefined;
  networkMessage?: string | undefined;
};

export function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-user-bubble px-4 py-2.5 text-user-bubble-foreground">
        {text}
      </p>
    </div>
  );
}

function Chips({ items, onPick }: { items?: string[] | undefined; onPick: (q: string) => void }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((s) => (
        <button
          key={s}
          onClick={() => onPick(s)}
          className="rounded-full border bg-card px-3.5 py-1.5 text-sm transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

/** One-line free-text reply sent as a follow-up to the card's question. */
function TextReply({
  placeholder,
  label,
  onSend,
}: {
  placeholder: string;
  label: string;
  onSend: (text: string) => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const send = () => {
    const t = text.trim();
    if (t) {
      onSend(t);
      setText("");
    }
  };
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-10 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
      />
      <Button
        type="submit"
        size="icon"
        variant="outline"
        className="size-10 rounded-xl"
        disabled={!text.trim()}
        aria-label={t("sendLabel", { label })}
      >
        <SendHorizontal />
      </Button>
    </form>
  );
}

/** Lets the owner adjust an answer in plain words ("chỉ năm 2026") instead of editing SQL. */
function RefineBox({
  suggestions,
  onRefine,
}: {
  suggestions?: string[] | undefined;
  onRefine: (text: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-2.5 border-t pt-4">
      <p className="text-sm font-medium text-muted-foreground">{t("refineTitle")}</p>
      <Chips items={suggestions} onPick={onRefine} />
      <TextReply placeholder={t("refinePlaceholder")} label={t("refineTitle")} onSend={onRefine} />
    </div>
  );
}

function StateCard({
  tone,
  icon,
  title,
  children,
}: {
  tone: "warning" | "danger" | "neutral" | "muted";
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  const tones = {
    warning: "border-warning/40 bg-warning-soft",
    danger: "border-destructive/30 bg-destructive-soft",
    neutral: "border-destructive/20 bg-card",
    muted: "bg-card",
  };
  const iconTone = {
    warning: "bg-warning/15 text-warning",
    danger: "bg-destructive/15 text-destructive",
    neutral: "bg-destructive/10 text-destructive",
    muted: "bg-secondary text-primary",
  };
  return (
    <div className={cn("space-y-4 rounded-2xl border p-5 sm:p-6", tones[tone])}>
      <div className="flex items-start gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", iconTone[tone])}>
          {icon}
        </span>
        <div className="min-w-0 space-y-1 pt-1.5">
          <h3 className="text-lg font-semibold leading-tight">{title}</h3>
        </div>
      </div>
      {children}
    </div>
  );
}

const STEPS: MessageKey[] = ["loading1", "loading2", "loading3"];

function LoadingCard() {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, STEPS.length - 1)), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6" aria-live="polite">
      <div className="flex items-center gap-2 text-sm text-primary">
        <span className="size-2 animate-pulse rounded-full bg-primary" /> {t(STEPS[i]!)}
      </div>
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

function TechDetails({
  sql,
  detail,
}: {
  sql?: string | null | undefined;
  detail?: string | null | undefined;
}) {
  const { t } = useI18n();
  if (!sql && !detail) return null;
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        {t("techDetails")}{" "}
        <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-3">
        {sql && <CodeView sql={sql} />}
        {detail && (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-code-bg p-4 font-mono text-xs text-destructive">
            {detail}
          </pre>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function OkBody({ r, onRefine }: { r: AskResponse; onRefine: (text: string) => void }) {
  const { t, lang } = useI18n();
  const [view, setView] = useState<"chart" | "table">(r.chart ? "chart" : "table");
  const nf = new Intl.NumberFormat("en-US");
  const retries = (r.attempts?.length ?? 0) - 1;
  return (
    <div className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="space-y-1.5">
        {r.summary && <p className="text-xl font-semibold leading-snug sm:text-2xl">{r.summary}</p>}
        {r.interpretation && (
          <p className="text-sm text-muted-foreground">{t("note", { text: r.interpretation })}</p>
        )}
        {retries > 0 && (
          <p className="inline-flex items-center gap-1.5 text-sm text-warning">
            <Wrench className="size-3.5" /> {t("retried", { n: retries })}
          </p>
        )}
      </div>
      {r.chart && r.rows.length > 0 && (
        <div className="inline-flex rounded-xl bg-muted p-1 text-sm">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium",
                view === v ? "bg-card shadow-sm" : "text-muted-foreground",
              )}
            >
              {v === "chart" ? <BarChart3 className="size-4" /> : <Table2 className="size-4" />}{" "}
              {t(v)}
            </button>
          ))}
        </div>
      )}
      {r.rows.length > 0 &&
        (view === "chart" && r.chart ? <ResultChart data={r} /> : <ResultTable data={r} />)}
      <div className="space-y-3">
        <ReasoningSteps steps={r.steps} />
        <SqlBlock data={r} />
      </div>
      {r.rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-t pt-4 text-sm text-muted-foreground">
          <CopyBtn text={toTsv(r, lang)} label={t("copyTable")} />
          <Button size="sm" variant="ghost" onClick={() => downloadCsv(r)}>
            <Download /> {t("downloadCsv")}
          </Button>
          <span className="ml-auto flex items-center gap-3">
            <span>
              {r.truncated
                ? t("showingFirst", { n: nf.format(r.rows.length) })
                : t("rows", { n: nf.format(r.row_count) })}
            </span>
            {r.elapsed_ms != null && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                {r.elapsed_ms < 1000
                  ? `${r.elapsed_ms} ms`
                  : t("seconds", { n: (r.elapsed_ms / 1000).toFixed(1) })}
              </span>
            )}
          </span>
        </div>
      )}
      <RefineBox suggestions={r.suggestions} onRefine={onRefine} />
    </div>
  );
}

type BodyProps = {
  r: AskResponse;
  onAsk: (q: string) => void;
  /** `part` is set when the text refines one part of a split answer. */
  onRefine: (text: string, part?: AskResponse) => void;
  onRetry: () => void;
};

function ResponseBody({ r, onAsk, onRefine, onRetry }: BodyProps): ReactNode {
  const { t } = useI18n();
  switch (r.status) {
    case "ok":
      return <OkBody r={r} onRefine={onRefine} />;
    case "empty":
      return (
        <StateCard tone="muted" icon={<Inbox className="size-5" />} title={t("emptyTitle")}>
          <p>{r.message ?? t("emptyDefault")}</p>
          <div className="space-y-3">
            <ReasoningSteps steps={r.steps} />
            <SqlBlock data={r} />
          </div>
          <RefineBox suggestions={r.suggestions} onRefine={onRefine} />
        </StateCard>
      );
    case "clarify":
      return (
        <StateCard
          tone="warning"
          icon={<HelpCircle className="size-5" />}
          title={t("clarifyTitle")}
        >
          {r.message && <p>{r.message}</p>}
          <Chips items={r.options} onPick={onRefine} />
          <TextReply
            placeholder={t("clarifyPlaceholder")}
            label={t("clarifyLabel")}
            onSend={onRefine}
          />
        </StateCard>
      );
    case "refused":
      return (
        <StateCard
          tone="neutral"
          icon={<ShieldAlert className="size-5" />}
          title={r.reason === "write_operation" ? t("refusedWrite") : t("refusedNotAvailable")}
        >
          {r.message && <p className="text-muted-foreground">{r.message}</p>}
          {!!r.suggestions?.length && (
            <p className="text-sm text-muted-foreground">{t("youCanAsk")}</p>
          )}
          <Chips items={r.suggestions} onPick={onAsk} />
        </StateCard>
      );
    case "info":
      return <InfoBody r={r} onAsk={onAsk} />;
    case "multi":
      return <MultiBody r={r} onAsk={onAsk} onRefine={onRefine} onRetry={onRetry} />;
    default:
      return (
        <StateCard
          tone="danger"
          icon={<AlertTriangle className="size-5" />}
          title={t("errorTitle")}
        >
          <p>{r.message ?? t("errorDefault")}</p>
          <TechDetails sql={r.sql} detail={r.error_detail} />
          <Button onClick={onRetry} variant="outline">
            <RotateCcw /> {t("retry")}
          </Button>
        </StateCard>
      );
  }
}

/** General questions ("bạn làm được gì?"): what the app does, what data it has, what to ask. */
function InfoBody({ r, onAsk }: { r: AskResponse; onAsk: (q: string) => void }) {
  const { t } = useI18n();
  return (
    <StateCard tone="neutral" icon={<Sparkles className="size-5" />} title={t("infoTitle")}>
      {r.message && <p>{r.message}</p>}
      {!!r.tables?.length && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{t("dataIRead")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {r.tables.map((t) => (
              <div key={t.name} className="rounded-xl border bg-card p-3">
                <p className="font-medium">{t.description}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.columns
                    .filter((c) => !/^id$|_id$/.test(c.name))
                    .map((c) => c.description)
                    .join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {!!r.suggestions?.length && <p className="text-sm text-muted-foreground">{t("tryAsking")}</p>}
      <Chips items={r.suggestions} onPick={onAsk} />
    </StateCard>
  );
}

/** A question with several independent asks, answered part by part with one query each. */
function MultiBody({ r, onAsk, onRefine, onRetry }: BodyProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Split className="size-4 shrink-0" />
        {r.message ?? t("multiDefault", { n: r.parts?.length ?? 0 })}
      </p>
      {r.parts?.map((part, i) => (
        <section key={i} className="space-y-2">
          <h3 className="text-sm font-semibold">{t("part", { n: i + 1, q: part.question })}</h3>
          <ResponseBody
            r={part}
            onAsk={onAsk}
            onRefine={(text) => onRefine(text, part)}
            onRetry={onRetry}
          />
        </section>
      ))}
    </div>
  );
}

export function AnswerCard({
  turn,
  onAsk,
  onRefine,
  onRetry,
}: {
  turn: Turn;
  onAsk: (q: string) => void;
  onRefine: (text: string, part?: AskResponse) => void;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  const r = turn.response;
  let body: ReactNode;
  if (turn.state === "loading") body = <LoadingCard />;
  else if (turn.state === "network") {
    body = (
      <StateCard tone="danger" icon={<WifiOff className="size-5" />} title={t("networkTitle")}>
        <p className="text-muted-foreground">{t("networkBody")}</p>
        {turn.networkMessage && <TechDetails detail={turn.networkMessage} />}
        <Button onClick={onRetry} variant="outline">
          <RotateCcw /> {t("retry")}
        </Button>
      </StateCard>
    );
  } else if (r) {
    body = <ResponseBody r={r} onAsk={onAsk} onRefine={onRefine} onRetry={onRetry} />;
  }
  return (
    <article id={`turn-${turn.id}`} className="scroll-mt-6 space-y-3">
      <UserBubble text={turn.question} />
      {body}
    </article>
  );
}
