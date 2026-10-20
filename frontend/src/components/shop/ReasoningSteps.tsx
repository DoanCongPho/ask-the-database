import { ChevronDown, ListChecks } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/** Plain-language explanation of how the answer was found, for owners who can't read SQL. */
export function ReasoningSteps({ steps }: { steps?: string[] | undefined }) {
  if (!steps?.length) return null;
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex items-center gap-2 text-sm font-medium text-primary hover:underline">
        <ListChecks className="size-4" /> Xem cách tôi tìm câu trả lời
        <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <ol className="space-y-2 rounded-xl bg-muted/60 p-4 text-sm">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <span className="leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}
