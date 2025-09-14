import type { GraphNode, QuadMatch, SubjectNode } from "@ldo/rdf-utils";
import type { BlankNode, Dataset, NamedNode } from "@rdfjs/types";
import { createSubjectHandler } from "./subjectProxy/createSubjectHandler.js";
import type { SubjectProxy } from "./subjectProxy/SubjectProxy.js";
import type { SetProxy } from "./setProxy/SetProxy.js";
import type { ContextUtil } from "./ContextUtil.js";
import type { LanguageOrdering } from "./language/languageTypes.js";
import { namedNode } from "@ldo/rdf-utils";
import type { RawValue } from "./util/RawObject.js";
import { createNewSetProxy } from "./setProxy/createNewSetProxy.js";

export interface ProxyContextOptions {
  dataset: Dataset;
  contextUtil: ContextUtil;
  writeGraphs: GraphNode[];
  languageOrdering: LanguageOrdering;
  state?: Record<string, unknown>;
}

const rdfType = namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");

/**
 * This file keeps track of the target objects used in the proxies.
 * The reason is so that JSON.stringify does not recurse inifinitely
 * when it encounters a circular object.
 */
export class ProxyContext {
  private subjectMap: Map<string, SubjectProxy> = new Map();
  private setMap: Map<string, SetProxy<NonNullable<RawValue>>> = new Map();

  readonly dataset: Dataset;
  readonly contextUtil: ContextUtil;
  readonly writeGraphs: GraphNode[];
  readonly languageOrdering: LanguageOrdering;
  public state: Record<string, unknown>;

  constructor(options: ProxyContextOptions) {
    this.dataset = options.dataset;
    this.contextUtil = options.contextUtil;
    this.writeGraphs = options.writeGraphs;
    this.languageOrdering = options.languageOrdering;
    this.state = options.state || {};
  }

  public createSubjectProxy(node: NamedNode | BlankNode): SubjectProxy {
    if (!this.subjectMap.has(node.value)) {
      const proxy = this.createNewSubjectProxy(node);
      this.subjectMap.set(node.value, proxy);
    }
    return this.subjectMap.get(node.value) as SubjectProxy;
  }

  protected createNewSubjectProxy(node: NamedNode | BlankNode): SubjectProxy {
    return new Proxy(
      { "@id": node },
      createSubjectHandler(this),
    ) as unknown as SubjectProxy;
  }

  private getSetKey(...quadMatch: QuadMatch) {
    return `${quadMatch[0]?.value || "undefined"}|${
      quadMatch[1]?.value || "undefined"
    }|${quadMatch[2]?.value || "undefined"}|${
      quadMatch[3]?.value || "undefined"
    }`;
  }

  public createSetProxy(
    quadMatch: QuadMatch,
    isSubjectOriented?: boolean,
    isLangStringSet?: boolean,
  ): SetProxy {
    const key = this.getSetKey(...quadMatch);
    if (!this.setMap.has(key)) {
      const proxy = this.createNewSetProxy(
        quadMatch,
        isSubjectOriented,
        isLangStringSet,
      );
      this.setMap.set(key, proxy);
    }
    return this.setMap.get(key)!;
  }

  protected createNewSetProxy(
    quadMatch: QuadMatch,
    isSubjectOriented?: boolean,
    isLangStringSet?: boolean,
  ) {
    return createNewSetProxy(
      quadMatch,
      isSubjectOriented ?? false,
      this,
      isLangStringSet,
    );
  }

  public duplicate(alternativeOptions: Partial<ProxyContextOptions>) {
    const fullOptions: ProxyContextOptions = {
      ...{
        dataset: this.dataset,
        contextUtil: this.contextUtil,
        writeGraphs: this.writeGraphs,
        languageOrdering: this.languageOrdering,
      },
      ...alternativeOptions,
    };
    return new ProxyContext(fullOptions);
  }

  public getRdfType(subjectNode: SubjectNode): NamedNode[] {
    return this.dataset
      .match(subjectNode, rdfType)
      .toArray()
      .map((quad) => quad.object)
      .filter((object): object is NamedNode => object.termType === "NamedNode");
  }
}
