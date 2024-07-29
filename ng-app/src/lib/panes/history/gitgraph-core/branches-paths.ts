import type { Commit } from "./commit";
import type { Branch } from "./branch";
import type { CommitStyleBase } from "./template";
import { pick } from "./utils";
import type { GraphRows } from "./graph-rows";

export { type BranchesPaths, type Coordinate, BranchesPathsCalculator, toSvgPath };

type BranchesPaths<TNode> = Map<Branch<TNode>, Coordinate[][]>;

interface Coordinate {
  x: number;
  y: number;
}

type InternalBranchesPaths<TNode> = Map<Branch<TNode>, InternalPaths>;

class InternalPaths {
  forks: Coordinate[][];
  branch: Coordinate[];
  merges: Coordinate[][];

  constructor(
  ) {
    this.forks = [];
    this.branch = [];
    this.merges = [];
  }

};

/**
 * Calculate branches paths of the graph.
 *
 * It follows the Command pattern:
 * => a class with a single `execute()` public method.
 *
 * Main benefit is we can split computation in smaller steps without
 * passing around parameters (we can rely on private data).
 */
class BranchesPathsCalculator<TNode> {
  private commits: Array<Commit<TNode>>;
  private rows:GraphRows<TNode>;
  private branches: Map<Branch["name"], Branch<TNode>>;
  private isGraphReverse: boolean;
  private commitSpacing: CommitStyleBase["spacing"];
  private branchesPaths: InternalBranchesPaths<TNode> = new Map<
    Branch<TNode>,
    InternalPaths
  >();

  constructor(
    commits: Array<Commit<TNode>>,
    rows: GraphRows<TNode>,
    branches: Map<Branch["name"], Branch<TNode>>,
    isGraphReverse: boolean,
    commitSpacing: CommitStyleBase["spacing"],
  ) {
    this.commits = commits;
    this.rows = rows;
    this.branches = branches;
    this.commitSpacing = commitSpacing;
    this.isGraphReverse = isGraphReverse;
  }

  /**
   * Compute branches paths for graph.
   */
  public execute(): BranchesPaths<TNode> {
    return this.fromCommits();
    // this.withMergeCommits();
    // return this.smoothBranchesPaths();
  }

  /**
   * Initialize branches paths from calculator's commits.
   */
  private fromCommits() : BranchesPaths<TNode> {
    const direction = this.isGraphReverse ? -1 : 1 ;
    this.commits.forEach((commit) => {
      let branch = this.branches.get(commit.branch);

      let existingBranchPath = this.branchesPaths.get(branch);
      if (!existingBranchPath) {
        let internal = new InternalPaths();
        commit.parents.forEach((parent) => {
          
          let rowOfParent = this.rows.getRowOf(parent);
          let parentCommit = this.commits[rowOfParent];
          if (parentCommit.col <= commit.col) {
            // this is a fork
            let path: Coordinate[] = [];
            path.push({ x: parentCommit.x, y: parentCommit.y });
            // add the smoothing points towards the first commit of the branch
            let distance = commit.row - rowOfParent;
            for (let d=0; d<distance; d++) {
              path.push({ x: commit.x, y: parentCommit.y + (1 + d)*this.commitSpacing * direction });
            }
            internal.forks.push(path);
          }
        });
        internal.branch.push({ x: commit.x, y: commit.y });
        this.branchesPaths.set(branch, internal);
      } else {
        if (commit.parents.length == 1) {
          existingBranchPath.branch.push({ x: commit.x, y: commit.y });
        } else {
          commit.parents.forEach((p) => {
            let rowOfParent = this.rows.getRowOf(p);
            let parentCommit = this.commits[rowOfParent];
            if (parentCommit.col == commit.col) {
              existingBranchPath.branch.push({ x: commit.x, y: commit.y });
            }
          });
        }
      }
      // doing the merges
      if (commit.parents.length > 1) {
        commit.parents.forEach((parent) => {
          let rowOfParent = this.rows.getRowOf(parent);
          let parentCommit = this.commits[rowOfParent];
          if (parentCommit.col > commit.col) {
            // this is a merge
            let path: Coordinate[] = [];
            path.push({ x: parentCommit.x, y: parentCommit.y });
            // add the smoothing points towards the merge commit
            let distance = commit.row - rowOfParent - 1;
            for (let d=0; d<distance; d++) {
              path.push({ x: parentCommit.x, y: parentCommit.y + (1 + d)*this.commitSpacing * direction});
            }
            path.push({ x: commit.x, y: commit.y });
            // adding this path to the internal of the merged branch
            let mergedBranchPath = this.branchesPaths.get(this.branches.get(parentCommit.branch));
            mergedBranchPath.merges.push(path);
          }
        });
      }


      // const firstParentCommit = this.commits.find(
      //   ({ hash }) => hash === commit.parents[0],
      // );
      // if (existingBranchPath) {
      //   path.push(...existingBranchPath);
      // } else if (firstParentCommit) {
      //   // Make branch path starts from parent branch (parent commit).
      //   path.push({ x: firstParentCommit.x, y: firstParentCommit.y });
      // }

      // this.branchesPaths.set(branch, path);
    });

    const branchesPaths = new Map<Branch<TNode>, Coordinate[][]>();

    this.branchesPaths.forEach((internal, branch) => {
      branchesPaths.set(branch, [
                  ...internal.forks,
                  internal.branch,
                  ...internal.merges,
                ]);
    });

    return branchesPaths;
  }

  /**
   * Insert merge commits points into `branchesPaths`.
   *
   * @example
   *     // Before
   *     [
   *       { x: 0, y: 640 },
   *       { x: 50, y: 560 }
   *     ]
   *
   *     // After
   *     [
   *       { x: 0, y: 640 },
   *       { x: 50, y: 560 },
   *       { x: 50, y: 560, mergeCommit: true }
   *     ]
   */
  // private withMergeCommits() {
  //   const mergeCommits = this.commits.filter(
  //     ({ parents }) => parents.length > 1,
  //   );

  //   mergeCommits.forEach((mergeCommit) => {

  //     let branch = this.branches.get(mergeCommit.branch);

  //     const lastPoints = [...(this.branchesPaths.get(branch) || [])];
  //     this.branchesPaths.set(branch, [
  //       ...lastPoints,
  //       { x: mergeCommit.x, y: mergeCommit.y, mergeCommit: true },
  //     ]);
  //   });
  // }


  /**
   * Smooth all paths by putting points on each row.
   */
  // private smoothBranchesPaths(): BranchesPaths<TNode> {
  //   const branchesPaths = new Map<Branch<TNode>, Coordinate[][]>();

  //   this.branchesPaths.forEach((points, branch) => {
  //     if (points.length <= 1) {
  //       branchesPaths.set(branch, [points]);
  //       return;
  //     }

  //     // Cut path on each merge commits
  //     // Coordinate[] -> Coordinate[][]

  //       points = points.sort((a, b) => (a.y > b.y ? -1 : 1));
      


  //       points = points.reverse();


  //     const paths = points.reduce<Coordinate[][]>(
  //       (mem, point, i) => {
  //         if (point.mergeCommit) {
  //           mem[mem.length - 1].push(pick(point, ["x", "y"]));
  //           let j = i - 1;
  //           let previousPoint = points[j];

  //           // Find the last point which is not a merge
  //           while (j >= 0 && previousPoint.mergeCommit) {
  //             j--;
  //             previousPoint = points[j];
  //           }

  //           // Start a new array with this point
  //           if (j >= 0) {
  //             mem.push([previousPoint]);
  //           }
  //         } else {
  //           mem[mem.length - 1].push(point);
  //         }
  //         return mem;
  //       },
  //       [[]],
  //     );


  //       paths.forEach((path) => path.reverse());


  //     // Add intermediate points on each sub paths
  //     if (true) {
  //       paths.forEach((subPath) => {
  //         if (subPath.length <= 1) return;
  //         const firstPoint = subPath[0];
  //         const lastPoint = subPath[subPath.length - 1];
  //         const column = subPath[1].x;
  //         const branchSize =
  //           Math.round(
  //             Math.abs(firstPoint.y - lastPoint.y) / this.commitSpacing,
  //           ) - 1;
  //         const branchPoints =
  //           branchSize > 0
  //             ? new Array(branchSize).fill(0).map((_, i) => ({
  //                 x: column,
  //                 y: subPath[0].y - this.commitSpacing * (i + 1),
  //               }))
  //             : [];
  //         const lastSubPaths = branchesPaths.get(branch) || [];
  //         branchesPaths.set(branch, [
  //           ...lastSubPaths,
  //           [firstPoint, ...branchPoints, lastPoint],
  //         ]);
  //       });
  //     } else {
  //       // paths.forEach((subPath) => {
  //       //   if (subPath.length <= 1) return;
  //       //   const firstPoint = subPath[0];
  //       //   const lastPoint = subPath[subPath.length - 1];
  //       //   const column = subPath[1].y;
  //       //   const branchSize =
  //       //     Math.round(
  //       //       Math.abs(firstPoint.x - lastPoint.x) / this.commitSpacing,
  //       //     ) - 1;
  //       //   const branchPoints =
  //       //     branchSize > 0
  //       //       ? new Array(branchSize).fill(0).map((_, i) => ({
  //       //           y: column,
  //       //           x: subPath[0].x + this.commitSpacing * (i + 1),
  //       //         }))
  //       //       : [];
  //       //   const lastSubPaths = branchesPaths.get(branch) || [];
  //       //   branchesPaths.set(branch, [
  //       //     ...lastSubPaths,
  //       //     [firstPoint, ...branchPoints, lastPoint],
  //       //   ]);
  //       // });
  //     }
  //   });

  //   return branchesPaths;
  // }
}

/**
 * Return a string ready to use in `svg.path.d` from coordinates
 *
 * @param coordinates Collection of coordinates
 */
function toSvgPath(
  coordinates: Coordinate[][],
  isBezier: boolean,
  //isVertical: boolean,
): string {
  return coordinates
    .map(
      (path) =>
        "M" +
        path
          .map(({ x, y }, i, points) => {
            if (
              isBezier &&
              points.length > 1 &&
              (i === 1 || i === points.length - 1)
            ) {
              const previous = points[i - 1];
              //if (isVertical) {
                const middleY = (previous.y + y) / 2;
                return `C ${previous.x} ${middleY} ${x} ${middleY} ${x} ${y}`;
              // } else {
              //   const middleX = (previous.x + x) / 2;
              //   return `C ${middleX} ${previous.y} ${middleX} ${y} ${x} ${y}`;
              // }
            }
            return `L ${x} ${y}`;
          })
          .join(" ")
          .slice(1),
    )
    .join(" ");
}
