import { createFileRoute } from "@tanstack/react-router";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ContextType,
  type ReactNode,
} from "react";
import {
  Ban,
  CheckCircle2,
  CircleSlash,
  Database,
  HelpCircle,
  Menu,
  Moon,
  Plus,
  SendHorizontal,
  Sparkles,
  Store,
  Sun,
  Trash2,
  AlertCircle,
  Languages,
  ListChecks,
  MessagesSquare,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AnswerCard, type Turn } from "@/components/shop/AnswerCard";
import { SchemaSheet } from "@/components/shop/SchemaSheet";
import { ask, USE_MOCK } from "@/lib/api";
import { NetworkError, type AskResponse, type HistoryTurn } from "@/lib/types";
import { EXAMPLES, I18nContext, I18nProvider, translate, useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hỏi Cửa Hàng" },
      {
        name: "description",
        content: "Hỏi về khách hàng, sản phẩm, đơn hàng và doanh thu bằng lời thường.",
      },
      { property: "og:title", content: "Hỏi Cửa Hàng" },
      { property: "og:description", content: "Trợ lý xem số liệu cho cửa hàng online của bạn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

const STORE_KEY = "ask-your-shop:turns";
const CONV_KEY = "ask-your-shop:conversation";

class FeedBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  { failed: boolean }
> {
  static override contextType = I18nContext;
  declare context: ContextType<typeof I18nContext>;
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(e: unknown) {
    console.error(e);
  }
  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive-soft p-6">
        <h3 className="text-lg font-semibold">{this.context.t("renderErrorTitle")}</h3>
        <p className="mt-1 text-muted-foreground">{this.context.t("renderErrorBody")}</p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => {
            this.setState({ failed: false });
            this.props.onReset();
          }}
        >
          {this.context.t("reload")}
        </Button>
      </div>
    );
  }
}

function StatusIcon({ t }: { t: Turn }) {
  const cls = "size-4 shrink-0";
  if (t.state === "loading")
    return <Loader2 className={cn(cls, "animate-spin text-muted-foreground")} />;
  if (t.state === "network") return <AlertCircle className={cn(cls, "text-destructive")} />;
  switch (t.response?.status) {
    case "ok":
      return <CheckCircle2 className={cn(cls, "text-success")} />;
    case "empty":
      return <CircleSlash className={cn(cls, "text-muted-foreground")} />;
    case "clarify":
      return <HelpCircle className={cn(cls, "text-warning")} />;
    case "info":
      return <Sparkles className={cn(cls, "text-primary")} />;
    case "multi":
      return <ListChecks className={cn(cls, "text-success")} />;
    case "refused":
      return <Ban className={cn(cls, "text-destructive")} />;
    default:
      return <AlertCircle className={cn(cls, "text-destructive")} />;
  }
}

type Conversation = { id: string; title: string; at: number; turns: Turn[] };

/** Conversations in the order they were started, newest first. Title = first question. */
const groupConversations = (all: Turn[]): Conversation[] => {
  const byId = new Map<string, Turn[]>();
  for (const t of all) byId.set(t.convId, [...(byId.get(t.convId) ?? []), t]);
  return [...byId]
    .map(([id, ts]) => ({ id, title: ts[0]!.question, at: ts[ts.length - 1]!.at, turns: ts }))
    .reverse();
};

// What the AI needs to understand a follow-up: the SQL plus what the owner saw
// (summary or message, clarify options, first rows). A split answer counts as one turn per part.
const toHistory = (r: AskResponse): HistoryTurn[] =>
  (r.status === "multi" && r.parts?.length ? r.parts : [r]).map((a) => ({
    question: a.question,
    sql: a.sql ?? null,
    status: a.status,
    answer: a.summary ?? a.message ?? null,
    options: a.options ?? [],
    columns: (a.columns ?? []).map((c) => c.name),
    rows: (a.rows ?? []).slice(0, 5),
  }));

const timeFmt = (n: number) =>
  new Date(n).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

/** The question box keeps its own draft, so typing re-renders only the box and not every
 * answer card and chart in the feed (that got slow in long conversations). */
function Composer({ loading, onAsk }: { loading: boolean; onAsk: (q: string) => boolean }) {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const submit = () => {
    if (onAsk(input)) setInput("");
  };
  return (
    <form
      className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/40"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        disabled={loading}
        placeholder={loading ? t("working") : t("askPlaceholder")}
        aria-label={t("yourQuestion")}
        className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 outline-none placeholder:text-muted-foreground disabled:opacity-60 field-sizing-content"
      />
      <Button
        type="submit"
        size="icon"
        className="size-11 rounded-xl"
        disabled={loading || !input.trim()}
        aria-label={t("send")}
      >
        {loading ? <Loader2 className="animate-spin" /> : <SendHorizontal />}
      </Button>
    </form>
  );
}

function App() {
  // Every turn of the session, tagged with its conversation. Only the open conversation is shown
  // and sent to the AI as context.
  const [allTurns, setAllTurns] = useState<Turn[]>([]);
  const [convId, setConvId] = useState<string>(() => crypto.randomUUID());
  const turns = allTurns.filter((t) => t.convId === convId);
  const conversations = groupConversations(allTurns);
  // Bumped by "new conversation" to clear the draft in the composer.
  const [composerKey, setComposerKey] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<Lang>("vi");
  const langRef = useRef<Lang>("vi");
  langRef.current = lang;
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) =>
    translate(lang, key, vars);
  const [feedKey, setFeedKey] = useState(0);
  const loaded = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loading = allTurns.some((t) => t.state === "loading");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      const stored = raw ? (JSON.parse(raw) as Turn[]).filter((t) => t.state !== "loading") : [];
      // Turns saved before conversations existed all belong to one conversation.
      setAllTurns(stored.map((t) => ({ ...t, convId: t.convId || "earlier" })));
      const open = sessionStorage.getItem(CONV_KEY);
      if (open) setConvId(open);
      setDark(localStorage.getItem("ask-your-shop:theme") === "dark");
      if (localStorage.getItem("ask-your-shop:lang") === "en") setLang("en");
    } catch {
      /* ignore */
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(allTurns));
      sessionStorage.setItem(CONV_KEY, convId);
    } catch {
      /* ignore */
    }
  }, [allTurns, convId]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("ask-your-shop:theme", dark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [dark]);
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("ask-your-shop:lang", lang);
    } catch {
      /* ignore */
    }
  }, [lang]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length]);

  const execute = useCallback(async (id: string, question: string, history: HistoryTurn[]) => {
    let res: AskResponse | undefined;
    let net: string | undefined;
    try {
      res = await ask({ question, history, lang: langRef.current });
      if (!res || typeof res !== "object" || !res.status)
        throw new NetworkError("Máy chủ trả về dữ liệu không hợp lệ");
      res = { ...res, columns: res.columns ?? [], rows: res.rows ?? [] };
    } catch (e) {
      net = e instanceof Error ? e.message : String(e);
    }
    setAllTurns((ts) =>
      ts.map((t) =>
        t.id === id
          ? {
              ...t,
              state: (res ? "done" : "network") as Turn["state"],
              response: res,
              networkMessage: net,
            }
          : t,
      ),
    );
  }, []);

  const historyFor = (list: Turn[]) =>
    list
      .filter((t) => t.state === "done" && t.response)
      // A split answer counts as one turn per part, each with its own SQL.
      .flatMap((t) => toHistory(t.response!))
      .slice(-6);

  const send = (q: string, history: HistoryTurn[]) => {
    const question = q.trim();
    if (!question || loading) return false;
    const id = crypto.randomUUID();
    setAllTurns((ts) => [...ts, { id, convId, question, at: Date.now(), state: "loading" }]);
    void execute(id, question, history);
    return true;
  };

  const askQuestion = (q: string) => send(q, historyFor(turns));

  // A refinement ("chỉ năm 2026") builds on the card it was typed under, even if newer cards exist.
  // Refining one part of a split answer builds on that part only.
  const refine = (t: Turn, text: string, part?: AskResponse) => {
    const idx = turns.findIndex((x) => x.id === t.id);
    const history = part
      ? [...historyFor(turns.slice(0, idx)), ...toHistory(part)].slice(-6)
      : historyFor(turns.slice(0, idx + 1));
    send(text, history);
  };

  const retry = (t: Turn) => {
    if (loading) return;
    const idx = turns.findIndex((x) => x.id === t.id);
    const history = historyFor(turns.slice(0, idx));
    setAllTurns((ts) =>
      ts.map((x) =>
        x.id === t.id
          ? { ...x, state: "loading" as const, response: undefined, networkMessage: undefined }
          : x,
      ),
    );
    void execute(t.id, t.question, history);
  };

  const jump = (id: string) => {
    setDrawer(false);
    setTimeout(
      () =>
        document
          .getElementById(`turn-${id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Store className="size-5" />
        </span>
        <div>
          <p className="font-semibold leading-tight">{t("appName")}</p>
          <p className="text-xs text-muted-foreground">
            {USE_MOCK ? t("sampleData") : t("shopData")}
          </p>
        </div>
      </div>
      <div className="px-3">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => {
            if (turns.length) setConvId(crypto.randomUUID());
            setComposerKey((k) => k + 1);
            setDrawer(false);
          }}
        >
          <Plus /> {t("newChat")}
        </Button>
      </div>
      <p className="px-5 pb-2 pt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("conversations")}
      </p>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {conversations.length === 0 && (
          <p className="px-2 text-sm text-muted-foreground">{t("historyEmpty")}</p>
        )}
        {turns.length === 0 && conversations.length > 0 && (
          <div className="rounded-lg bg-sidebar-accent px-2 py-2 text-sm font-medium">
            {t("newChat")}
          </div>
        )}
        {conversations.map((c) => {
          const open = c.id === convId;
          return (
            <div key={c.id} className={cn("rounded-lg", open && "bg-sidebar-accent/60 pb-1")}>
              <button
                onClick={() => {
                  setConvId(c.id);
                  setDrawer(false);
                }}
                aria-current={open ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-sidebar-accent",
                  open && "font-medium",
                )}
              >
                <MessagesSquare className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{c.title}</span>
                <span className="text-xs text-muted-foreground">{timeFmt(c.at)}</span>
              </button>
              {open &&
                c.turns.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => jump(t.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg py-1.5 pl-6 pr-2 text-left text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  >
                    <StatusIcon t={t} />
                    <span className="min-w-0 flex-1 truncate">{t.question}</span>
                  </button>
                ))}
            </div>
          );
        })}
      </nav>
      {allTurns.length > 0 && (
        <div className="border-t p-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            disabled={loading}
            onClick={() => {
              setAllTurns([]);
              setConvId(crypto.randomUUID());
            }}
          >
            <Trash2 /> {t("clearAll")}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <I18nProvider lang={lang} setLang={setLang}>
      <div className="flex h-dvh overflow-hidden bg-background">
        <aside className="hidden w-72 shrink-0 border-r bg-sidebar text-sidebar-foreground md:block">
          {sidebar}
        </aside>
        <Sheet open={drawer} onOpenChange={setDrawer}>
          <SheetContent side="left" className="w-72 bg-sidebar p-0">
            <SheetTitle className="sr-only">{t("history")}</SheetTitle>
            {sidebar}
          </SheetContent>
        </Sheet>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 border-b px-3 py-2.5 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={t("openHistory")}
              onClick={() => setDrawer(true)}
            >
              <Menu />
            </Button>
            <p className="font-semibold md:hidden">{t("appName")}</p>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setSchemaOpen(true)}>
                <Database /> {t("data")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="font-semibold"
                aria-label={t("switchLang")}
                title={t("switchLang")}
                onClick={() => setLang((l) => (l === "vi" ? "en" : "vi"))}
              >
                <Languages /> {lang === "vi" ? "VI" : "EN"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("toggleTheme")}
                onClick={() => setDark((d) => !d)}
              >
                {dark ? <Sun /> : <Moon />}
              </Button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6">
              {turns.length === 0 ? (
                <section className="flex min-h-[55vh] flex-col justify-center gap-6">
                  <span className="grid size-14 place-items-center rounded-2xl bg-accent text-primary">
                    <Store className="size-7" />
                  </span>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                      {t("hello")}
                    </h1>
                    <p className="text-lg text-muted-foreground">{t("intro")}</p>
                  </div>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    <Database className="size-4 text-primary" /> {t("dataAvailable")}
                    <span className="text-foreground">{t("dataFacts")}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLES[lang].map((e) => (
                      <button
                        key={e}
                        onClick={() => askQuestion(e)}
                        className="rounded-full border bg-card px-4 py-2 text-sm transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </section>
              ) : (
                <FeedBoundary key={feedKey} onReset={() => setFeedKey((k) => k + 1)}>
                  {turns.map((t) => (
                    <div key={t.id} className="space-y-8">
                      <AnswerCard
                        turn={t}
                        onAsk={askQuestion}
                        onRefine={(text, part) => refine(t, text, part)}
                        onRetry={() => retry(t)}
                      />
                    </div>
                  ))}
                </FeedBoundary>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
            <Composer key={composerKey} loading={loading} onAsk={askQuestion} />
            <p className="mx-auto mt-1.5 max-w-3xl px-1 text-xs text-muted-foreground">
              {t("enterHint")}
            </p>
          </div>
        </main>
        <SchemaSheet open={schemaOpen} onOpenChange={setSchemaOpen} />
      </div>
    </I18nProvider>
  );
}
