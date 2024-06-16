import type { TemplateOptions } from "./template";
import { Commit, type CommitRenderOptions, type CommitOptions } from "./commit";

import type { GitgraphCore } from "./gitgraph";


export {
  type GitgraphCommitOptions,
  GitgraphUserApi,
};

interface GitgraphCommitOptions<TNode> extends CommitRenderOptions<TNode> {
  author?: string;
  subject?: string;
  body?: string;
  hash?: string;
  style?: TemplateOptions["commit"];
  dotText?: string;
  tag?: string;
  onClick?: (commit: Commit<TNode>) => void;
  onMessageClick?: (commit: Commit<TNode>) => void;
  onMouseOver?: (commit: Commit<TNode>) => void;
  onMouseOut?: (commit: Commit<TNode>) => void;
}

class GitgraphUserApi<TNode> {
  // tslint:disable:variable-name - Prefix `_` = explicitly private for JS users
  private _graph: GitgraphCore<TNode>;
  private _onGraphUpdate: () => void;
  // tslint:enable:variable-name

  constructor(graph: GitgraphCore<TNode>, onGraphUpdate: () => void) {
    this._graph = graph;
    this._onGraphUpdate = onGraphUpdate;
  }

  /**
   * Clear everything (as `rm -rf .git && git init`).
   */
  public clear(): this {
    this._graph.commits = [];
    this._onGraphUpdate();
    return this;
  }

  public swimlanes(data: unknown) {
  
    const invalidData = new Error(
      "list of swimlanes is invalid",
    );

    if (!Array.isArray(data)) {
      throw invalidData;
    }

    const areDataValid = data.every((options) => {
      return (
        typeof options === "string" || typeof options === "boolean"
      );
    });

    if (!areDataValid) {
      throw invalidData;
    }

    this._graph.swimlanes = data;
    this._graph.last_on_swimlanes = Array.apply(null, Array(data.length)).map(function () {})

  }

  public commit(data: unknown) {

    const areDataValid = (
        typeof data === "object" &&
        Array.isArray(data["parents"])
      );

    if (!areDataValid) {
      throw new Error(
        "invalid commit",
      );
    }

    // let heads: string[];
    // this._graph.swimlanes.forEach((branch, col) => {
    //   if (branch) {
    //     heads.push(this._graph.last_on_swimlanes[col]);
    //   }
    // });

    let branch;
    let lane;
    if (data["parents"].every((parents) => {
      return this._graph.last_on_swimlanes.includes(parents);
    })) {
      lane = Number.MAX_VALUE;
      data["parents"].forEach((parent) => {
        let new_lane = this._graph.last_on_swimlanes.indexOf(parent);
        if ( new_lane < lane ) {
          lane = new_lane;
        }
      });
      branch = this._graph.swimlanes[lane];
      if (!branch) {
        branch = data["hash"];
        this._graph.swimlanes[lane] = branch;
      }
      this._graph.last_on_swimlanes[lane] = data["hash"];
    } else {
      branch = data["hash"];
      // this._graph.swimlanes.some((b, col) => {
      //   console.log("is empty? ",col,!b);
      //   if (!b) {
      //     lane = col;
      //     return true;
      //   }
      // });
      // if (!lane) {
        lane = this._graph.swimlanes.length;
        this._graph.swimlanes.push(branch);
        this._graph.last_on_swimlanes.push(branch);
      // } else {
      //   this._graph.swimlanes[lane] = branch;
      //   this._graph.last_on_swimlanes[lane] = branch;
      // }
    }

    data["parents"].forEach((parent) => {
      let r = this._graph.rows.getRowOf(parent);
      let c = this._graph.commits[r];
      let b = c.branch;
      if (branch!=b) {
        this._graph.swimlanes.forEach((bb, col) => {
          if (bb == b) {
            this._graph.swimlanes[col] = undefined;
          }
        });
      }
    });

    // if (!this._graph.branches.has(branch)) {
    //   this._graph.createBranch({name:branch});
    // }

    data["branch"] = branch;
    data["x"] = lane;
    data["y"] = this._graph.commits.length;

    let options:CommitOptions<TNode> = {
      x: data["x"],
      y: data["y"],
      ...data,
      style: {
        ...this._graph.template.commit,
        message: {
          ...this._graph.template.commit.message,
          display: this._graph.shouldDisplayCommitMessage,
        },
      },
      author: data["author"],
      subject: data["subject"],
    }
    let n = new Commit(options);
    this._graph.commits.push(n);

    this._onGraphUpdate();

  }

  /**
   * Import a JSON.
   *
   * Data can't be typed since it comes from a JSON.
   * We validate input format and throw early if something is invalid.
   *
   * @experimental
   * @param data JSON from `git2json` output
   */
  public import(data: unknown) {
    const invalidData = new Error(
      "invalid history",
    );

    // We manually validate input data instead of using a lib like yup.
    // => this is to keep bundlesize small.

    if (!Array.isArray(data)) {
      throw invalidData;
    }

    const areDataValid = data.every((options) => {
      return (
        typeof options === "object"
      );
    });

    if (!areDataValid) {
      throw invalidData;
    }

    const commitOptionsList: Array<
      CommitOptions<TNode> & { refs: string[] }
    > = data
      .map((options) => ({
        ...options,
        style: {
          ...this._graph.template.commit,
          message: {
            ...this._graph.template.commit.message,
            display: this._graph.shouldDisplayCommitMessage,
          },
        },
        author: options.author,
      }));

    // Use validated `value`.
    this.clear();

    this._graph.commits = commitOptionsList.map(
      (options) => new Commit(options),
    );

    this._onGraphUpdate();

    return this;
  }

  // tslint:enable:variable-name
}
