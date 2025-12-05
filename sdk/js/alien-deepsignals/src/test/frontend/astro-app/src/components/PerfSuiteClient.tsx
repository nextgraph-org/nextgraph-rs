import React, { useEffect, useMemo, useState } from "react";
import { registerPerfRunners } from "../../../utils/perfScenarios";
import type { PerfScenarioResult } from "../../../utils/state";

type ListedResult = PerfScenarioResult & { entryId: string };

const MAX_RESULTS = 12;

const sortResults = (results: ListedResult[]) =>
    [...results].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

const resultSignature = (result: PerfScenarioResult) =>
    [
        result.framework,
        result.variant,
        result.completedAt ?? result.totalDuration,
        result.runCount,
    ].join(":");

const attachEntryId = (result: PerfScenarioResult): ListedResult => ({
    ...result,
    entryId: `${result.framework}-${result.variant}-${result.completedAt ?? Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
});

const seedResults = () => {
    if (typeof window === "undefined") return [] as ListedResult[];
    const latest = window.perfSuite?.latestResults;
    if (!latest) return [] as ListedResult[];
    const flattened = Object.values(latest).flatMap((variants) =>
        Object.values(variants)
    );
    return sortResults(flattened.map(attachEntryId));
};

const formatDuration = (value: number) => `${value.toFixed(2)}ms`;

const formatSubRenderCount = (
    block: PerfScenarioResult["blocks"][string],
    framework: string
) => {
    const entries = block.objectRenderCounts?.[framework];
    if (!entries) return 0;
    return Object.values(entries).reduce((sum, count) => sum + count, 0);
};

const PerfSuiteClient: React.FC = () => {
    const [results, setResults] = useState<ListedResult[]>(seedResults);

    useEffect(() => {
        if (registerPerfRunners()) {
            return;
        }

        const timer = window.setInterval(() => {
            if (registerPerfRunners()) {
                window.clearInterval(timer);
            }
        }, 50);

        return () => {
            window.clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const suite = window.perfSuite;
        if (!suite?.subscribe) return;
        const unsubscribe = suite.subscribe((result) => {
            setResults((current) => {
                if (
                    current.some(
                        (entry) =>
                            resultSignature(entry) === resultSignature(result)
                    )
                ) {
                    return current;
                }
                const augmented = attachEntryId(result);
                const next = sortResults([augmented, ...current]);
                return next.slice(0, MAX_RESULTS);
            });
        });
        return unsubscribe;
    }, []);

    const renderedList = useMemo(() => {
        if (!results.length) {
            return (
                <p className="perf-suite-results__empty">
                    Awaiting perf runner output…
                </p>
            );
        }
        return results.map((result) => (
            <li key={result.entryId} className="perf-suite-results__item">
                <header>
                    <strong>
                        {result.framework}/{result.variant}
                    </strong>
                    <span>{formatDuration(result.totalDuration)}</span>
                </header>
                <div className="perf-suite-results__meta">
                    <span>
                        runs {result.runCount}
                        {result.warmupCount
                            ? ` (+${result.warmupCount} warmup)`
                            : ""}
                    </span>
                    {result.completedAt ? (
                        <time>
                            {new Date(result.completedAt).toLocaleTimeString()}
                        </time>
                    ) : null}
                </div>
                <dl>
                    {Object.entries(result.blocks).map(([name, block]) => (
                        <React.Fragment key={name}>
                            <div className="perf-suite-results__block">
                                <dt>{name}</dt>
                                <dd>{formatDuration(block.duration)}</dd>
                            </div>
                            <div className="perf-suite-results__block perf-suite-results__block--subrenders">
                                <dt>Subcomponent renders</dt>
                                <dd>
                                    {formatSubRenderCount(
                                        block,
                                        result.framework
                                    )}
                                </dd>
                            </div>
                        </React.Fragment>
                    ))}
                </dl>
            </li>
        ));
    }, [results]);

    return (
        <div className="perf-suite-results">
            <div className="perf-suite-results__header">
                <h3>Latest Perf Runs</h3>
                <p>Playwright tests stream into this dashboard.</p>
            </div>
            <ul>{renderedList}</ul>
            <style>
                {`
                .perf-suite-results {
                    border: 1px solid var(--astro-color-border, rgba(120, 120, 120, 0.4));
                    border-radius: 0.75rem;
                    padding: 1rem;
                    margin-top: 1.5rem;
                    max-width: 720px;
                }
                .perf-suite-results__header {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                    margin-bottom: 0.5rem;
                }
                .perf-suite-results__header h3 {
                    margin: 0;
                    font-size: 1.1rem;
                }
                .perf-suite-results__header p {
                    margin: 0;
                    opacity: 0.8;
                    font-size: 0.9rem;
                }
                .perf-suite-results ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                .perf-suite-results__item {
                    background: rgba(120, 120, 120, 0.08);
                    border: 1px solid rgba(120, 120, 120, 0.3);
                    border-radius: 0.5rem;
                    padding: 0.75rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                }
                .perf-suite-results__item header {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.95rem;
                }
                .perf-suite-results__item header strong {
                    text-transform: capitalize;
                }
                .perf-suite-results__meta {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.8rem;
                    opacity: 0.8;
                }
                .perf-suite-results__block {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.85rem;
                }
                .perf-suite-results__block--subrenders {
                    opacity: 0.85;
                }
                .perf-suite-results__block dt {
                    margin: 0;
                    text-transform: capitalize;
                }
                .perf-suite-results__block dd {
                    margin: 0;
                }
                .perf-suite-results__empty {
                    font-style: italic;
                    opacity: 0.8;
                }
            `}
            </style>
        </div>
    );
};

export default PerfSuiteClient;
