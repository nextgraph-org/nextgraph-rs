import { Branch } from "./branch";
import type { Commit } from "./commit";
import { createGraphRows, GraphRows } from "./graph-rows";
//import { BranchesOrder, CompareBranchesOrder } from "./branches-order";
import {
  Template,
  type TemplateOptions,
  TemplateName,
  getTemplate,
} from "./template";
import { BranchesPathsCalculator, type BranchesPaths } from "./branches-paths";
import { booleanOptionOr, numberOptionOr } from "./utils";
import {
  GitgraphUserApi,
} from "./gitgraph-user-api";

export { type GitgraphOptions, type RenderedData, GitgraphCore };

type Color = string;

class BranchesOrder<TNode> {
  private branches: Map<Branch["name"], Branch<TNode>>;
  private colors: Color[];
  public constructor(
    branches: Map<Branch["name"], Branch<TNode>>,
    colors: Color[],
  ) {
    this.colors = colors;
    this.branches = branches;
  }
  /**
   * Return the order of the given branch name.
   *
   * @param branchName Name of the branch
   */
  public get(branchName: Branch["name"]): number {
    return this.branches.get(branchName).index;
  }
  
  public getColorOf(branchName: Branch["name"]): Color {
    return this.colors[this.get(branchName) % this.colors.length];
  }
}

interface GitgraphOptions {
  template?: TemplateName | Template;
  initCommitOffsetX?: number;
  initCommitOffsetY?: number;
  author?: string;
  branchLabelOnEveryCommit?: boolean;
  commitMessage?: string;
  generateCommitHash?: () => Commit["hash"];
}

interface RenderedData<TNode> {
  commits: Array<Commit<TNode>>;
  branchesPaths: BranchesPaths<TNode>;
  commitMessagesX: number;
}

class GitgraphCore<TNode = SVGElement> {
  public get isHorizontal(): boolean {
    return false;
  }
  // public get isVertical(): boolean {
  //   return true;
  // }
  public get isReverse(): boolean {
    return true;
  }
  public get shouldDisplayCommitMessage(): boolean {
    return true;
  }

  public initCommitOffsetX: number;
  public initCommitOffsetY: number;
  public author: string;
  public commitMessage: string;
  public template: Template;
  public rows: GraphRows<TNode>;

  public commits: Array<Commit<TNode>> = [];
  public swimlanes: Array<any> = [];
  public last_on_swimlanes: Array<string> = [];
  public branches: Map<Branch["name"], Branch<TNode>> = new Map();

  private listeners: Array<(data: RenderedData<TNode>) => void> = [];
  private nextTimeoutId: number | null = null;

  constructor(options: GitgraphOptions = {}) {
    this.template = getTemplate(options.template);


    // Set all options with default values
    this.initCommitOffsetX = numberOptionOr(options.initCommitOffsetX, 0);
    this.initCommitOffsetY = numberOptionOr(options.initCommitOffsetY, 0);
    this.author = options.author || "";
    this.commitMessage =
      options.commitMessage || "";

  }

  /**
   * Return the API to manipulate Gitgraph as a user.
   * Rendering library should give that API to their consumer.
   */
  public getUserApi(): GitgraphUserApi<TNode> {
    return new GitgraphUserApi(this, () => this.next());
  }

  /**
   * Add a change listener.
   * It will be called any time the graph have changed (commit, merge…).
   *
   * @param listener A callback to be invoked on every change.
   * @returns A function to remove this change listener.
   */
  public subscribe(listener: (data: RenderedData<TNode>) => void): () => void {
    this.listeners.push(listener);

    let isSubscribed = true;

    return () => {
      if (!isSubscribed) return;
      isSubscribed = false;
      const index = this.listeners.indexOf(listener);
      this.listeners.splice(index, 1);
    };
  }

  /**
   * Return all data required for rendering.
   * Rendering libraries will use this to implement their rendering strategy.
   */
  public getRenderedData(): RenderedData<TNode> {
    const commits = this.computeRenderedCommits();
    const branchesPaths = this.computeRenderedBranchesPaths(commits);
    const commitMessagesX = this.computeCommitMessagesX(branchesPaths);

    this.computeBranchesColor(branchesPaths);

    return { commits, branchesPaths, commitMessagesX };
  }

  public createBranch(args: any): Branch<TNode> {
 
    let options = {
      gitgraph: this,
      name: "",
      parentCommitHash: "",
      style: this.template.branch,
      onGraphUpdate: () => this.next(),
    };

      args.style = args.style || {};
      options = {
        ...options,
        ...args,
        style: {
          ...options.style,
          ...args.style,
          label: {
            ...options.style.label,
            ...args.style.label,
          },
        },
      };
    

    const branch = new Branch<TNode>(options);
    branch.index = this.branches.size;
    this.branches.set(branch.name, branch);
    return branch;
  }

  /**
   * Return commits with data for rendering.
   */
  private computeRenderedCommits(): Array<Commit<TNode>> {
    //const branches = this.getBranches();
    // // Commits that are not associated to a branch in `branches`
    // // were in a deleted branch. If the latter was merged beforehand
    // // they are reachable and are rendered. Others are not
    // const reachableUnassociatedCommits = (() => {
    //   const unassociatedCommits = new Set(
    //     this.commits.reduce(
    //       (commits: Commit["hash"][], { hash }: { hash: Commit["hash"] }) =>
    //         !branches.has(hash) ? [...commits, hash] : commits,
    //       [],
    //     ),
    //   );

    //   const tipsOfMergedBranches = this.commits.reduce(
    //     (tipsOfMergedBranches: Commit<TNode>[], commit: Commit<TNode>) =>
    //       commit.parents.length > 1
    //         ? [
    //             ...tipsOfMergedBranches,
    //             ...commit.parents
    //               .slice(1)
    //               .map(
    //                 (parentHash) =>
    //                   this.commits.find(({ hash }) => parentHash === hash)!,
    //               ),
    //           ]
    //         : tipsOfMergedBranches,
    //     [],
    //   );

    //   const reachableCommits = new Set();

    //   tipsOfMergedBranches.forEach((tip) => {
    //     let currentCommit: Commit<TNode> | undefined = tip;

    //     while (currentCommit && unassociatedCommits.has(currentCommit.hash)) {
    //       reachableCommits.add(currentCommit.hash);

    //       currentCommit =
    //         currentCommit.parents.length > 0
    //           ? this.commits.find(
    //               ({ hash }) => currentCommit!.parents[0] === hash,
    //             )
    //           : undefined;
    //     }
    //   });

    //   return reachableCommits;
    // })();

    this.commits.forEach(
      ({ branch, col, hash }) => {
        if (!this.branches.has(branch)) {
          this.createBranch({name:branch});
        }
        this.last_on_swimlanes[col] = hash;
      }
    );
      
    this.rows = createGraphRows(this.commits);
    const branchesOrder = new BranchesOrder<TNode>(
      this.branches,
      this.template.colors,
    );

    return (
      this.commits
        .map((commit) => this.withPosition(commit))
        // Fallback commit computed color on branch color.
        .map((commit) =>
          commit.withDefaultColor(
            this.getBranchDefaultColor(branchesOrder, commit.branch),
          ),
        )
    );
  }

    /**
   * Return the default color for given branch.
   *
   * @param branchesOrder Computed order of branches
   * @param branchName Name of the branch
   */
     private getBranchDefaultColor(
      branchesOrder: BranchesOrder<TNode>,
      branchName: Branch["name"],
    ): string {
      return branchesOrder.getColorOf(branchName);
    }

  /**
   * Return branches paths with all data required for rendering.
   *
   * @param commits List of commits with rendering data computed
   */
  private computeRenderedBranchesPaths(
    commits: Array<Commit<TNode>>,
  ): BranchesPaths<TNode> {
    return new BranchesPathsCalculator<TNode>(
      commits,
      this.rows,
      this.branches,
      this.isReverse,
      this.template.commit.spacing,
    ).execute();
  }

  /**
   * Set branches colors based on branches paths.
   *
   * @param commits List of graph commits
   * @param branchesPaths Branches paths to be rendered
   */
  private computeBranchesColor(
    branchesPaths: BranchesPaths<TNode>,
  ): void {
    const branchesOrder = new BranchesOrder<TNode>(
      this.branches,
      this.template.colors,
    );
    Array.from(branchesPaths).forEach(([branch]) => {
      branch.computedColor =
        branch.style.color ||
        this.getBranchDefaultColor(branchesOrder, branch.name);
    });
  }

  /**
   * Return commit messages X position for rendering.
   *
   * @param branchesPaths Branches paths to be rendered
   */
  private computeCommitMessagesX(branchesPaths: BranchesPaths<TNode>): number {
    return this.swimlanes.length * this.template.branch.spacing;
  }

  /**
   * Get all branches from current commits.
   */
  // private getBranches(): Map<Commit["hash"], Set<Branch["name"]>> {
  //   const result = new Map<Commit["hash"], Set<Branch["name"]>>();
  //   this.commits.forEach((commit) => {
  //     let r = new Set<Branch["name"]>();
  //     r.add(commit.branch);
  //     result.set(commit.hash, r);
  //   });
  //   return result;
  // }

  /**
   * Add position to given commit.
   *
   * @param rows Graph rows
   * @param branchesOrder Computed order of branches
   * @param commit Commit to position
   */
  private withPosition(
    commit: Commit<TNode>,
  ): Commit<TNode> {
    //const row = rows.getRowOf(commit.hash);
    const maxRow = this.rows.getMaxRow();

    //const order = branchesOrder.get(commit.branch);

    if (this.isReverse) {
      return commit.setPosition({
        x: this.initCommitOffsetX + this.template.branch.spacing * commit.col,
        y: this.initCommitOffsetY + this.template.commit.spacing * (maxRow - commit.row),
      });
    }
    else {
      return commit.setPosition({
        x: this.initCommitOffsetX + this.template.branch.spacing * commit.col,
        y: this.initCommitOffsetY + this.template.commit.spacing * commit.row,
      });
    }


      
  }


  /**
   * Tell each listener something new happened.
   * E.g. a rendering library will know it needs to re-render the graph.
   */
  private next() {
    if (this.nextTimeoutId) {
      window.clearTimeout(this.nextTimeoutId);
    }

    // Use setTimeout() with `0` to debounce call to next tick.
    this.nextTimeoutId = window.setTimeout(() => {
      this.listeners.forEach((listener) => listener(this.getRenderedData()));
    }, 0);
  }
}
