# Research: apps that answer data questions from plain language

Quick scan (2026-10-20) of text-to-SQL / "chat with your data" products and papers: Snowflake Cortex Analyst, Databricks Genie, ThoughtSpot Sage, Julius AI, Vanna AI, Wren AI, the AmbiSQL paper, and LLM text-to-SQL surveys. Several sources are vendor or review pages, so treat the numbers as indicative.

## Problems they report

| # | Problem | Source | What it means for us |
|---|---|---|---|
| P1 | **Ambiguity is the #1 failure.** Words like "best", or a term that matches several columns, lead to wrong SQL. Snowflake's own example is "What was the best product last year?" | AmbiSQL paper, Snowflake blog, LLM text-to-SQL survey | This is exactly our Q8. Ask, don't guess. |
| P2 | **Plausible but wrong answers.** The SQL runs, the number looks fine, but it answers a different question. Non-technical users can't spot it. | Julius reviews, ThoughtSpot docs ("occasionally inaccurate") | Show *how* the answer was found, in plain language, not only as SQL. |
| P3 | **Complex multi-table questions are much less accurate.** One case study: 85–95% on simple questions, ~40% → 75% on complex ones. | ZenML case study (Cortex) | Few-shot examples should cover joins and CTEs, and retry on errors. |
| P4 | **Unneeded tables or columns confuse the model.** | Databricks Genie docs | Our schema is small. Keep the prompt focused on it. |
| P5 | **Bad examples hurt accuracy.** Invalid example queries make results worse. | Snowflake VQR docs | Run every few-shot SQL against the DB before using it. |
| P6 | **Benchmarks overstate real accuracy**, because one question can map to several valid SQLs. | Apple/Waterloo paper | Test with our own question set, not only the 8 given. |
| P7 | **Silent auto-retry can hide failures**: a different approach gets shown as a clean answer. | Julius reviews | When we retry, say so in the UI. |
| P8 | **Large results get slow**, and connecting to databases is fragile. | Julius reviews | Row cap, a virtualized table, and a clear "can't reach DB" state. |
| P9 | **The AI must not be able to write.** The common advice is a read-only DB user. | Vanna / tool guides | Read-only role plus read-only transaction plus validator. |

## Ideas they use

Status values: **Adopt** = in our plan; **Later** = future work for the README; **Skip** = not worth it here.

| # | Idea | Who | Status for us |
|---|---|---|---|
| I1 | **Classify the question before writing SQL**: answerable, ambiguous, or not answerable. Reject or clarify early instead of giving misleading answers. | Snowflake Cortex Analyst | **Adopt.** The LLM returns `kind: sql / clarify / refuse` first. |
| I2 | **Multiple-choice clarifying questions.** | AmbiSQL | **Adopt.** Clarify chips in Vietnamese, e.g. "Theo số lượng bán / doanh thu / số khách mua". |
| I3 | **Show the interpretation**: the matched measures, filters and columns, so users can check them. | ThoughtSpot Sage (search tokens) | **Adopt** as the Vietnamese steps behind "Xem cách tôi tìm câu trả lời". |
| I4 | **Business definitions layer**: define terms such as revenue or active customer once. | Wren AI, Snowflake semantic model | **Adopt (light).** A small glossary in the system prompt, e.g. revenue = paid orders only, `quantity × unit_price_vnd`. No separate semantic layer. |
| I5 | **Verified queries**: reuse approved question→SQL pairs and mark answers as "Trusted". | Snowflake VQR, Databricks trusted assets | **Later.** Needs a store of verified queries; this is the RAG idea we deferred. |
| I6 | **Thumbs up / down on answers**: upvotes get reused, downvotes go to review. | ThoughtSpot | **Later.** Cheap UI, but the loop only pays off with I5. |
| I7 | **Benchmark of 10–20 questions written before building**, re-run after every change. | Databricks blog | **Adopt.** `eval.py` with the 8 test questions plus our own. |
| I8 | **Read-only DB user for the AI.** | Vanna / guides | **Adopt.** |
| I9 | **Auto-retry on SQL errors.** | Julius | **Adopt, with transparency.** Show "Đã tự sửa sau N lần thử". |
| I10 | **Confidence meter.** | ThoughtSpot (announced 2023, shipping unconfirmed) | **Skip.** LLM self-confidence isn't reliable; clarify-first covers the need better. |
| I11 | **Create views to simplify hard joins.** | Medium write-up (Cortex) | **Skip.** It changes the DB, and 4 tables don't need it. |

## Takeaways for our design

1. Our clarify-first choice for ambiguous questions matches what Snowflake does in production (I1, I2).
2. Plain-language steps (I3) are the main defense against wrong answers that look right (P2). SQL alone doesn't help a shop owner.
3. A focused prompt with verified few-shot examples, retry and an eval set covers P3–P6 without RAG.

## Sources

- [AmbiSQL: Interactive Ambiguity Detection and Resolution for Text-to-SQL](https://arxiv.org/pdf/2508.15276)
- [A Survey of Text-to-SQL in the Era of LLMs](https://arxiv.org/pdf/2408.05109)
- [Next-Generation Database Interfaces: A Survey of LLM-based Text-to-SQL](https://arxiv.org/pdf/2406.08426)
- [Apple/Waterloo paper on text-to-SQL evaluation](https://arxiv.org/pdf/2501.18197v1)
- [From natural language to SQL: approaches and challenges (Medium)](https://toashishagarwal.medium.com/from-natural-language-to-sql-approaches-and-challenges-in-text2sql-d1252ff86321)
- [Snowflake Cortex Analyst: Behind the Scenes](https://www.snowflake.com/en/blog/engineering/snowflake-cortex-analyst-behind-the-scenes/)
- [Cortex Analyst Verified Query Repository](https://docs.snowflake.com/user-guide/snowflake-cortex/cortex-analyst/verified-query-repository)
- [Natural Language Analytics with Snowflake Cortex (ZenML case study)](https://zenml.io/llmops-database/natural-language-analytics-with-snowflake-cortex-for-self-service-bi)
- [Databricks: Use trusted assets in Genie spaces](https://docs.databricks.com/aws/en/genie/trusted-assets)
- [Databricks: How to build production-ready Genie spaces](https://www.databricks.com/en/blog/how-build-production-ready-genie-spaces-and-build-trust-along-way)
- [ThoughtSpot Sage search best practices](https://docs.thoughtspot.com/cloud/latest/ai-answers-best-practices)
- [ThoughtSpot Sage search](https://docs.thoughtspot.com/cloud/latest/sage-search)
- [ThoughtSpot's generative AI assistant gets personal (SiliconANGLE)](https://siliconangle.com/2024/01/31/thoughtspots-generative-ai-assistant-gets-personal/)
- [How does Julius AI compare to other AI tools (Querio)](https://querio.ai/articles/how-does-julius-ai-compare-to-other-ai-tools-for-data-analysis)
- [Julius AI Alternatives (Ajelix)](https://ajelix.com/?p=19629)
- [Wren AI vs. Vanna (Querio)](https://querio.ai/articles/wren-ai-vs-vanna-ai-open-source-text-to-sql-compared)
- [Vanna AI: open-source text-to-SQL (local)](https://themenonlab.blog/blog/text-to-sql-open-source-local)
