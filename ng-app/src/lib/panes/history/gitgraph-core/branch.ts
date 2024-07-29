import type { Commit, CommitRenderOptions } from "./commit";
import type { GitgraphCore } from "./gitgraph";
import type { TemplateOptions, BranchStyle } from "./template";

export {
  type BranchCommitDefaultOptions,
  type BranchRenderOptions,
  type BranchOptions,
  Branch,
};

interface BranchCommitDefaultOptions<TNode> extends CommitRenderOptions<TNode> {
  author?: string;
  subject?: string;
  style?: TemplateOptions["commit"];
}

interface BranchRenderOptions<TNode> {
  renderLabel?: (branch: Branch<TNode>) => TNode;
}

interface BranchOptions<TNode = SVGElement> extends BranchRenderOptions<TNode> {
  /**
   * Gitgraph constructor
   */
  gitgraph: GitgraphCore<TNode>;
  /**
   * Branch name
   */
  name: string;
  /**
   * Branch style
   */
  style: BranchStyle;
  /**
   * Parent commit
   */
  parentCommitHash?: Commit["hash"];
  /**
   * Default options for commits
   */
  commitDefaultOptions?: BranchCommitDefaultOptions<TNode>;
  /**
   * On graph update.
   */
  onGraphUpdate: () => void;
}

const DELETED_BRANCH_NAME = "";

class Branch<TNode = SVGElement> {
  public name: BranchOptions["name"];
  public style: BranchStyle;
  public index: number = 0;
  public computedColor?: BranchStyle["color"];
  public parentCommitHash: BranchOptions["parentCommitHash"];
  public commitDefaultOptions: BranchCommitDefaultOptions<TNode>;
  public renderLabel: BranchOptions<TNode>["renderLabel"];

  private gitgraph: GitgraphCore<TNode>;
  private onGraphUpdate: () => void;

  constructor(options: BranchOptions<TNode>) {
    this.gitgraph = options.gitgraph;
    this.name = options.name;
    this.style = options.style;
    this.parentCommitHash = options.parentCommitHash;
    this.commitDefaultOptions = options.commitDefaultOptions || { style: {} };
    this.onGraphUpdate = options.onGraphUpdate;
    this.renderLabel = options.renderLabel;
  }

}

