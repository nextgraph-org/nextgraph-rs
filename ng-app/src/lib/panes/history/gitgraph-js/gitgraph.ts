import {
  GitgraphCore,
  type GitgraphOptions,
  Commit,
  type GitgraphCommitOptions,
  type RenderedData,
  MergeStyle,
  arrowSvgPath,
  toSvgPath,
  type Coordinate,
  TemplateName,
  templateExtend,
} from "../gitgraph-core";

import {
  createSvg,
  createG,
  createText,
  createCircle,
  createUse,
  createPath,
  createClipPath,
  createDefs,
  createForeignObject,
} from "./svg-elements";

import { createTooltip, PADDING as TOOLTIP_PADDING } from "./tooltip";

type CommitOptions = GitgraphCommitOptions<SVGElement>;

export {
  createGitgraph,
  TemplateName,
  templateExtend,
  MergeStyle,
};

interface CommitYWithOffsets {
  [key: number]: number;
}

function createGitgraph(
  graphContainer: HTMLElement,
  options?: GitgraphOptions & { responsive?: boolean },
) {
  let commitsElements: {
    [commitHash: string]: {
      message: SVGGElement | null;
    };
  } = {};
  // Store a map to replace commits y with the correct value,
  // including the message offset. Allows custom, flexible message height.
  // E.g. {20: 30} means for commit: y=20 -> y=30
  // Offset should be computed when graph is rendered (componentDidUpdate).
  let commitYWithOffsets: CommitYWithOffsets = {};
  let shouldRecomputeOffsets = false;
  let lastData: RenderedData<SVGElement>;
  let $commits: SVGElement;
  let commitMessagesX = 0;
  let $tooltip: SVGElement | null = null;

  // Create an `svg` context in which we'll render the graph.
  const svg = createSvg();
  adaptSvgOnUpdate(Boolean(options && options.responsive));
  graphContainer.appendChild(svg);

  if (options && options.responsive) {
    graphContainer.setAttribute(
      "style",
      "display:inline-block; position: relative; width:100%; padding-bottom:100%; vertical-align:middle; overflow:hidden;",
    );
  }

  // React on gitgraph updates to re-render the graph.
  const gitgraph = new GitgraphCore(options);
  gitgraph.subscribe((data) => {
    shouldRecomputeOffsets = true;
    render(data);
  });

  // Return usable API for end-user.
  return gitgraph.getUserApi();

  function render(data: RenderedData<SVGElement>): void {
    // Reset before new rendering to flush previous state.
    commitsElements = {};

    const { commits, branchesPaths } = data;
    commitMessagesX = data.commitMessagesX;

    // Store data so we can re-render after offsets are computed.
    lastData = data;

    // Store $commits so we can compute offsets from actual height.
    $commits = renderCommits(commits);

    // Reset SVG with new content.
    svg.innerHTML = "";
    svg.appendChild(
      createG({
        // Translate graph left => left-most branch label is not cropped (horizontal)
        // Translate graph down => top-most commit tooltip is not cropped
        translate: { x: 10, y: TOOLTIP_PADDING },
        scale: 0.75,
        children: [renderBranchesPaths(branchesPaths), $commits],
      }),
    );
  }

  function adaptSvgOnUpdate(adaptToContainer: boolean): void {
    const observer = new MutationObserver(() => {
      if (shouldRecomputeOffsets) {
        shouldRecomputeOffsets = false;
        computeOffsets();
        render(lastData);
      } else {
        positionCommitsElements();
        adaptGraphDimensions(adaptToContainer);
      }
    });

    observer.observe(svg, {
      attributes: false,
      // Listen to subtree changes to react when we append the tooltip.
      subtree: true,
      childList: true,
    });

    function computeOffsets(): void {
      const commits: Element[] = Array.from($commits.children);
      let totalOffsetY = 0;

      // In VerticalReverse orientation, commits are in the same order in the DOM.
      const orientedCommits = commits;

      commitYWithOffsets = orientedCommits.reduce<CommitYWithOffsets>(
        (newOffsets, commit) => {
          const commitY = parseInt(
            commit.getAttribute("transform")!.split(",")[1].slice(0, -1),
            10,
          );

          const firstForeignObject = commit.getElementsByTagName(
            "foreignObject",
          )[0];
          const customHtmlMessage =
            firstForeignObject && firstForeignObject.firstElementChild;

          newOffsets[commitY] = commitY + totalOffsetY;

          // Increment total offset after setting the offset
          // => offset next commits accordingly.
          totalOffsetY += getMessageHeight(customHtmlMessage);

          return newOffsets;
        },
        {},
      );
    }

    function positionCommitsElements(): void {
      if (gitgraph.isHorizontal) {
        // Elements don't appear on horizontal mode, yet.
        return;
      }

      const padding = 10;

      // Ensure commits elements (branch labels, message…) are well positionned.
      // It can't be done at render time since elements size is dynamic.
      Object.keys(commitsElements).forEach((commitHash) => {
        const { message } = commitsElements[commitHash];

        // We'll store X position progressively and translate elements.
        let x = commitMessagesX;

        if (message) {
          moveElement(message, x);
        }
      });
    }

    function adaptGraphDimensions(adaptToContainer: boolean): void {
      const { height, width } = svg.getBBox();

      // FIXME: In horizontal mode, we mimic @gitgraph/react behavior
      // => it gets re-rendered after offsets are computed
      // => it applies paddings twice!
      //
      // It works… by chance. Technically, we should compute what would
      // *actually* go beyond the computed limits of the graph.
      const horizontalCustomOffset = 50;
      const verticalCustomOffset = 20;

      const widthOffset =  // Add `TOOLTIP_PADDING` so we don't crop the tooltip text.
          
          TOOLTIP_PADDING;

      const heightOffset = 
        // Add `TOOLTIP_PADDING` so we don't crop tooltip text
          TOOLTIP_PADDING + verticalCustomOffset;

      if (adaptToContainer) {
        svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
        svg.setAttribute(
          "viewBox",
          `0 0 ${width + widthOffset} ${height + heightOffset}`,
        );
      } else {
        svg.setAttribute("width", (width + widthOffset).toString());
        svg.setAttribute("height", (height + heightOffset).toString());
      }
    }
  }

  function moveElement(target: Element, x: number): void {
    const transform = target.getAttribute("transform") || "translate(0, 0)";
    target.setAttribute(
      "transform",
      transform.replace(/translate\(([\d\.]+),/, `translate(${x},`),
    );
  }

  function renderBranchesPaths(
    branchesPaths: RenderedData<SVGElement>["branchesPaths"],
  ): SVGElement {
    const offset = gitgraph.template.commit.dot.size;
    const isBezier = gitgraph.template.branch.mergeStyle === MergeStyle.Bezier;

    const paths = Array.from(branchesPaths).map(([branch, coordinates]) => {
      return createPath({
        d: toSvgPath(
          coordinates.map((coordinate) => coordinate.map(getWithCommitOffset)),
          isBezier,
          //gitgraph.isVertical,
        ),
        fill: "none",
        stroke: branch.computedColor || "",
        strokeWidth: branch.style.lineWidth,
        translate: {
          x: offset,
          y: offset,
        },
      });
    });

    return createG({ children: paths });
  }

  function renderCommits(commits: Commit[]): SVGGElement {
    return createG({ children: commits.map(renderCommit) });

    function renderCommit(commit: Commit): SVGGElement {
      const { x, y } = getWithCommitOffset(commit);

      return createG({
        translate: { x, y },
        children: [
          renderDot(commit),
          ...renderArrows(commit),

          createG({
            translate: { x: -x, y: 0 },
            children: [
              renderMessage(commit),
            ],
          }),
        ],
      });
    }

    function renderArrows(commit: Commit): Array<SVGElement | null> {
      if (!gitgraph.template.arrow.size) {
        return [null];
      }

      const commitRadius = commit.style.dot.size;

      return commit.parents.map((parentHash) => {
        const parent = commits.find(({ hash }) => hash === parentHash);
        if (!parent) return null;

        // Starting point, relative to commit
        const origin =  { x: commitRadius, y: commitRadius };

        const path = createPath({
          d: arrowSvgPath(gitgraph, parent, commit),
          fill: gitgraph.template.arrow.color || "",
        });

        return createG({ translate: origin, children: [path] });
      });
    }
  }

  function renderMessage(commit: Commit): SVGElement | null {
    if (!commit.style.message.display) {
      return null;
    }

    let message;

    if (commit.renderMessage) {
      message = createG({ children: [] });

      // Add message after observer is set up => react based on body height.
      // We might refactor it by including `onChildrenUpdate()` to `createG()`.
      adaptMessageBodyHeight(message);
      message.appendChild(commit.renderMessage(commit));

      setMessageRef(commit, message);

      return message;
    }

    let msg = commit.message.split(" ");

    const text = createText({
      content: msg[0],
      fill: commit.style.message.color || "",
      font: commit.style.message.font,
      onClick: commit.onMessageClick,
    });

    const text2 = createText({
      content: msg[1],
      fill: commit.style.message.color || "",
      font: commit.style.message.font,
      onClick: commit.onMessageClick,
    });

    message = createG({
      translate: { x: 0, y: commit.style.dot.size },
      children: [text],
    });

    let message2 = createG({
      translate: { x: 0, y: commit.style.dot.size*2 },
      children: [text2],
    });

    message.appendChild(message2);

    if (commit.body) {
      const body = createForeignObject({
        width: 600,
        translate: { x: 10, y: 0 },
        content: commit.body,
      });

      // Add message after observer is set up => react based on body height.
      // We might refactor it by including `onChildrenUpdate()` to `createG()`.
      adaptMessageBodyHeight(message);
      message.appendChild(body);
    }

    setMessageRef(commit, message);

    return message;
  }

  function adaptMessageBodyHeight(message: SVGElement): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(({ target }) => setChildrenForeignObjectHeight(target));
    });

    observer.observe(message, {
      attributes: false,
      subtree: false,
      childList: true,
    });

    function setChildrenForeignObjectHeight(node: Node): void {
      if (node.nodeName === "foreignObject") {
        // We have to access the first child's parentElement to retrieve
        // the Element instead of the Node => we can compute dimensions.
        const foreignObject = node.firstChild && node.firstChild.parentElement;
        if (!foreignObject) return;

        // Force the height of the foreignObject (browser issue)
        foreignObject.setAttribute(
          "height",
          getMessageHeight(foreignObject.firstElementChild).toString(),
        );
      }

      node.childNodes.forEach(setChildrenForeignObjectHeight);
    }
  }

  function renderDot(commit: Commit): SVGElement {
    if (commit.renderDot) {
      return commit.renderDot(commit);
    }

    /*
    In order to handle strokes, we need to do some complex stuff here… 😅

    Problem: strokes are drawn inside & outside the circle.
    But we want the stroke to be drawn inside only!

    The outside overlaps with other elements, as we expect the dot to have a fixed size. So we want to crop the outside part.

    Solution:
    1. Create the circle in a <defs>
    2. Define a clip path that references the circle
    3. Use the clip path, adding the stroke.
    4. Double stroke width as half of it will be clipped (the outside part).

    Ref.: https://stackoverflow.com/a/32162431/3911841

    P.S. there is a proposal for a stroke-alignment property,
    but it's still a W3C Draft ¯\_(ツ)_/¯
    https://svgwg.org/specs/strokes/#SpecifyingStrokeAlignment
  */
    const circleId = commit.hash;
    const circle = createCircle({
      id: circleId,
      radius: commit.style.dot.size,
      fill: commit.style.dot.color || "",
    });

    const clipPathId = `clip-${commit.hash}`;
    const circleClipPath = createClipPath();
    circleClipPath.setAttribute("id", clipPathId);
    circleClipPath.appendChild(createUse(circleId));

    const useCirclePath = createUse(circleId);
    useCirclePath.setAttribute("clip-path", `url(#${clipPathId})`);
    useCirclePath.setAttribute("stroke", commit.style.dot.strokeColor || "");
    const strokeWidth = commit.style.dot.strokeWidth
      ? commit.style.dot.strokeWidth * 2
      : 0;
    useCirclePath.setAttribute("stroke-width", strokeWidth.toString());

    const dotText = commit.dotText
      ? createText({
          content: commit.dotText,
          font: commit.style.dot.font,
          anchor: "middle",
          translate: { x: commit.style.dot.size, y: commit.style.dot.size },
        })
      : null;

    return createG({
      onClick: commit.onClick,
      onMouseOver: () => {
        appendTooltipToGraph(commit);
        commit.onMouseOver();
      },
      onMouseOut: () => {
        if ($tooltip) $tooltip.remove();
        commit.onMouseOut();
      },
      children: [createDefs([circle, circleClipPath]), useCirclePath, dotText],
    });
  }

  function appendTooltipToGraph(commit: Commit): void {
    if (!svg.firstChild) return;

    const tooltip = commit.renderTooltip
      ? commit.renderTooltip(commit)
      : createTooltip(commit);

    $tooltip = createG({
      translate: getWithCommitOffset(commit),
      children: [tooltip],
    });

    svg.firstChild.appendChild($tooltip);
  }

  function getWithCommitOffset({ x, y }: Coordinate): Coordinate {
    return { x, y: commitYWithOffsets[y] || y };
  }

  function setMessageRef(commit: Commit, message: SVGGElement | null): void {
    if (!commitsElements[commit.hashAbbrev]) {
      initCommitElements(commit);
    }

    commitsElements[commit.hashAbbrev].message = message;
  }


  function initCommitElements(commit: Commit): void {
    commitsElements[commit.hashAbbrev] = {
      message: null,
    };
  }
}

function getMessageHeight(message: Element | null): number {
  let messageHeight = 0;

  if (message) {
    const height = message.getBoundingClientRect().height;
    const marginTopInPx = window.getComputedStyle(message).marginTop || "0px";
    const marginTop = parseInt(marginTopInPx.replace("px", ""), 10);

    messageHeight = height + marginTop;
  }

  return messageHeight;
}
