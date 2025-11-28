import React, { useEffect, useMemo, useState } from "react";
import { registerPerfRunners } from "../../../utils/perfScenarios";
import type { PerfScenarioResult } from "../../../utils/state";

const sortResults = (results: PerfScenarioResult[]) =>
    [...results].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

const seedResults = () => {
    if (typeof window === "undefined") return [] as PerfScenarioResult[];
    const latest = window.perfSuite?.latestResults;
    if (!latest) return [] as PerfScenarioResult[];
    const flattened = Object.values(latest).flatMap((variants) =>
        Object.values(variants)
    );
    return sortResults(flattened);
};

const formatDuration = (value: number) => `${value.toFixed(2)}ms`;

const PerfSuiteClient: React.FC = () => {
    const [results, setResults] = useState<PerfScenarioResult[]>(seedResults);

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
                const filtered = current.filter(
                    (entry) =>
                        !(
                            entry.framework === result.framework &&
                            entry.variant === result.variant
                        )
                );
                return sortResults([...filtered, result]);
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
            <li
                key={`${result.framework}-${result.variant}`}
                className="perf-suite-results__item"
            >
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
                        <div key={name} className="perf-suite-results__block">
                            <dt>{name}</dt>
                            <dd>{formatDuration(block.duration)}</dd>
                        </div>
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
