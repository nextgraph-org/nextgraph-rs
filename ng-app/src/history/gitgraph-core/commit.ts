import type { CommitStyle } from "./template";
import type { Branch } from "./branch";

export { type CommitRenderOptions, type CommitOptions, Commit };

interface CommitRenderOptions<TNode> {
  renderDot?: (commit: Commit<TNode>) => TNode;
  renderMessage?: (commit: Commit<TNode>) => TNode;
  renderTooltip?: (commit: Commit<TNode>) => TNode;
}

interface CommitOptions<TNode> extends CommitRenderOptions<TNode> {
  author: string;
  subject: string;
  style: CommitStyle;
  x: number;
  y: number;
  body?: string;
  hash?: string;
  parents?: string[];
  dotText?: string;
  branch?: Branch["name"];
  onClick?: (commit: Commit<TNode>) => void;
  onMessageClick?: (commit: Commit<TNode>) => void;
  onMouseOver?: (commit: Commit<TNode>) => void;
  onMouseOut?: (commit: Commit<TNode>) => void;
}

/**
 * Generate a random hash.
 *
 * @return hex string with 40 chars
 */
const getRandomHash = () =>
  (
    Math.random().toString(16).substring(3) +
    Math.random().toString(16).substring(3) +
    Math.random().toString(16).substring(3) +
    Math.random().toString(16).substring(3)
  ).substring(0, 40);

class Commit<TNode = SVGElement> {

  public branch?: Branch["name"];
  /**
   * Commit x position
   */
  public x = 0;
  /**
   * Commit y position
   */
  public y = 0;
  /**
   * Commit hash
   */
  public row = 0;

  public col = 0;

  public hash: string;
  /**
   * Abbreviated commit hash
   */
  public hashAbbrev: string;
  /**
   * Parent hashes
   */
  public parents: Array<Commit<TNode>["hash"]>;
  /**
   * Abbreviated parent hashed
   */
  public parentsAbbrev: Array<Commit<TNode>["hashAbbrev"]>;
  /**
   * Author
   */
  public author: {
    /**
     * Author name
     */
    name: string;
    /**
     * Author email
     */
    email?: string;
    /**
     * Author date
     */
    timestamp?: number;
  };
  /**
   * Committer
   */
  public committer: {
    /**
     * Commiter name
     */
    name: string;
    /**
     * Commiter email
     */
    email?: string;
    /**
     * Commiter date
     */
    timestamp?: number;
  };
  /**
   * Subject
   */
  public subject: string;
  /**
   * Body
   */
  public body: string;
  /**
   * Message
   */
  public get message() {
    let message = "";

    if (this.style.message.displayHash) {
      message += `${this.hashAbbrev} `;
    }

    message += this.subject;

    if (this.style.message.displayAuthor) {
      message += ` - ${this.author.name} <${this.author.email}>`;
    }

    return message;
  }
  /**
   * Style
   */
  public style: CommitStyle;
  /**
   * Text inside commit dot
   */
  public dotText?: string;
  /**
   * List of branches attached
   */

  /**
   * Callback to execute on click.
   */
  public onClick: () => void;
  /**
   * Callback to execute on click on the commit message.
   */
  public onMessageClick: () => void;
  /**
   * Callback to execute on mouse over.
   */
  public onMouseOver: () => void;
  /**
   * Callback to execute on mouse out.
   */
  public onMouseOut: () => void;
  /**
   * Custom dot render
   */
  public renderDot?: (commit: Commit<TNode>) => TNode;
  /**
   * Custom message render
   */
  public renderMessage?: (commit: Commit<TNode>) => TNode;
  /**
   * Custom tooltip render
   */
  public renderTooltip?: (commit: Commit<TNode>) => TNode;

  constructor(options: CommitOptions<TNode>) {
    // Set author & committer
    let name = options.author;
    
    this.col = options.x;
    this.row = options.y;

    this.author = { name };
    this.committer = { name };
    this.branch = options.branch;

    // Set commit message
    this.subject = options.subject;
    this.body = options.body || "";

    // Set commit hash
    this.hash = options.hash || getRandomHash();
    this.hashAbbrev = this.hash.substring(0, 7);

    // Set parent hash
    this.parents = options.parents ? options.parents : [];
    this.parentsAbbrev = this.parents.map((commit) => commit.substring(0, 7));

    // Set style
    this.style = {
      ...options.style,
      message: { ...options.style.message },
      dot: { ...options.style.dot },
    };

    this.dotText = options.dotText;

    // Set callbacks
    this.onClick = () => (options.onClick ? options.onClick(this) : undefined);
    this.onMessageClick = () =>
      options.onMessageClick ? options.onMessageClick(this) : undefined;
    this.onMouseOver = () =>
      options.onMouseOver ? options.onMouseOver(this) : undefined;
    this.onMouseOut = () =>
      options.onMouseOut ? options.onMouseOut(this) : undefined;

    // Set custom renders
    this.renderDot = options.renderDot;
    this.renderMessage = options.renderMessage;
    this.renderTooltip = options.renderTooltip;
  }

  public setPosition({ x, y }: { x: number; y: number }): this {
    this.x = x;
    this.y = y;
    return this;
  }

  public withDefaultColor(color: string): Commit<TNode> {
    const newStyle = {
      ...this.style,
      dot: { ...this.style.dot },
      message: { ...this.style.message },
    };

    if (!newStyle.color) newStyle.color = color;
    if (!newStyle.dot.color) newStyle.dot.color = color;
    if (!newStyle.message.color) newStyle.message.color = color;

    const commit = this.cloneCommit();
    commit.style = newStyle;

    return commit;
  }

  /**
   * Ideally, we want Commit to be a [Value Object](https://martinfowler.com/bliki/ValueObject.html).
   * We started with a mutable class. So we'll refactor that little by little.
   * This private function is a helper to create a new Commit from existing one.
   */
  private cloneCommit() {
    const commit = new Commit({
      author: `${this.author.name} <${this.author.email}>`,
      subject: this.subject,
      branch: this.branch,
      style: this.style,
      body: this.body,
      y: this.row,
      x: this.col,
      hash: this.hash,
      parents: this.parents,
      dotText: this.dotText,
      onClick: this.onClick,
      onMessageClick: this.onMessageClick,
      onMouseOver: this.onMouseOver,
      onMouseOut: this.onMouseOut,
      renderDot: this.renderDot,
      renderMessage: this.renderMessage,
      renderTooltip: this.renderTooltip,
    });

    commit.x = this.x;
    commit.y = this.y;

    return commit;
  }
}
