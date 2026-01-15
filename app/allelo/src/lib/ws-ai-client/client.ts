import {
	ClientInboundMessage,
	ServerOutboundMessage,
	ServerToolCallRequest,
	ServerAssistantMessage,
	ServerStreamStart,
	ServerStreamChunk,
	ServerStreamEnd,
	ServerSessionStarted,
	ServerVectorSaveResult,
	ServerVectorSearchResult,
	SingleVectorResult,
	ToolResult,
	ChatCompletionMessageParam
} from './types';
import { Tool } from './tools';
export { tools } from './tools';
export type { ChatCompletionMessageParam };

const WebSocket = window.WebSocket;

/**
 * Configuration options for the WebSocket client
 */
export interface ClientConfig {
	// WebSocket server URL
	url: string;

	// System prompt
	system_prompt?: string;

	// System prompt extra context
	system_extra_context?: string;
	
	// Handler for executing tool calls
	toolHandler?: (name: string, args: any) => Promise<any>;
	
	// Available tools to register with the server
	tools?: Tool[];
	
	// Timeout for request-response operations in milliseconds (default: 120000)
	timeout?: number;
	
	/** Optional logger for debugging */
	logger?: {
		info: (message: string, ...args: any[]) => void;
		warn: (message: string, ...args: any[]) => void;
		error: (message: string, ...args: any[]) => void;
	};
}

/**
 * Pending request tracking for Promise-based operations
 */
interface PendingRequest<T = any> {
	resolve: (value: T) => void;
	reject: (error: Error) => void;
	timer: NodeJS.Timeout;
	type: string;
	// Streaming state
	isStreaming?: boolean;
	accumulatedContent?: string;
	onStreamStart?: () => void;
	onStreamChunk?: (delta: string, accumulated: string) => void;
}

/**
 * Event callbacks for client lifecycle events
 */
export interface ClientEvents {
	onConnected?: () => void;
	onDisconnected?: () => void;
	onSessionStarted?: (sessionId: string) => void;
	onAssistantMessage?: (content: string) => void;
	onStreamStart?: () => void;
	onStreamChunk?: (delta: string, accumulated: string) => void;
	onStreamEnd?: (content: string) => void;
	onToolsRequest?: () => void;
	onVectorSaveResult?: (success: boolean) => void;
	onVectorSearchResult?: (results: SingleVectorResult[]) => void;
	onError?: (error: string | Error) => void;
}

/**
 * Options for streaming prompts
 */
export interface StreamingOptions {
	onStreamStart?: () => void;
	onStreamChunk?: (delta: string, accumulated: string) => void;
	onStreamEnd?: (content: string) => void;
}

/**
 * WebSocket client for bidirectional communication with AI agent server
 * 
 * @example
 * ```typescript
 * const client = new WSClient({
 *   url: 'ws://localhost:8012',
 *   toolHandler: async (name, args) => {
 *     // Your tool implementation
 *   },
 *   tools: myTools
 * });
 * 
 * client.on({
 *   onConnected: () => console.log('Connected!'),
 *   onAssistantMessage: (msg) => console.log('Assistant:', msg)
 * });
 * 
 * await client.connect();
 * const response = await client.sendPrompt('Hello!');
 * ```
 */
export class WSClient {
	private ws?: WebSocket;
	private sessionId?: string;
	private config: ClientConfig;
	private events: ClientEvents = {};
	private isConnected: boolean = false;
	private pendingRequests: Map<string, PendingRequest> = new Map();
	private requestIdCounter: number = 0;

	constructor(config: ClientConfig) {
		this.config = {
			timeout: 120000, // 60 seconds default
			...config,
		};
	}

	/**
	 * Register event callbacks
	 */
	public on(events: ClientEvents): void {
		this.events = { ...this.events, ...events };
	}

	/**
	 * Connect to the WebSocket server
	 */
	public connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.ws = new WebSocket(this.config.url);
			
			this.ws.onopen = () => {
				this.isConnected = true;
				this.log('info', 'Connected to server');
				this.events.onConnected?.();
				resolve();
			};

			this.ws.onmessage = async (data: MessageEvent) => {
				try {
					const message = JSON.parse(data.data) as ServerOutboundMessage;
					await this.handleMessage(message);
				} catch (error) {
					this.log('error', 'Failed to parse message:', error);
					this.events.onError?.(error as Error);
				}
			};

			this.ws.onerror = (event: Event) => {
				this.log('error', 'WebSocket error:', event);
				this.events.onError?.((event as ErrorEvent).error);
				reject(event);
			};

			this.ws.onclose = () => {
				this.isConnected = false;
				this.log('warn', 'Disconnected from server');
				this.events.onDisconnected?.();
			};
		});
	}

	/**
	 * Check if client is currently connected
	 */
	public get connected(): boolean {
		return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
	}

	/**
	 * Get current session ID
	 */
	public getSessionId(): string | undefined {
		return this.sessionId;
	}

	/**
	 * Send a prompt to the AI agent
	 */
	public async sendPrompt(messages: ChatCompletionMessageParam[], agent_type?: string, extra_context?: string): Promise<string> {
		return this.sendPromptInternal(messages, agent_type, extra_context, false);
	}

	/**
	 * Send a prompt to the AI agent with streaming support
	 */
	public async sendPromptStreaming(
		messages: ChatCompletionMessageParam[], 
		options?: StreamingOptions & { agent_type?: string; extra_context?: string }
	): Promise<string> {
		return this.sendPromptInternal(
			messages, 
			options?.agent_type, 
			options?.extra_context, 
			true,
			options
		);
	}

	/**
	 * Internal method to send prompts with optional streaming
	 */
	private async sendPromptInternal(
		messages: ChatCompletionMessageParam[],
		agent_type?: string,
		extra_context?: string,
		stream?: boolean,
		streamOptions?: StreamingOptions
	): Promise<string> {
		this.assertConnected();
		if (!messages || messages.length === 0) {
			throw new Error('Messages are empty');
		}
		this.log('info', `Sending messages: "${JSON.stringify(messages)}"`);

		const requestId = this.generateRequestId();

		const message: ClientInboundMessage = {
			type: 'client/prompt',
			requestId,
			messages,
			agent_type,
			sessionId: this.sessionId,
			extra_context: this.mergeExtraContext(extra_context),
			stream,
		};

		return new Promise<string>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pendingRequests.delete(requestId);
				reject(new Error(`Prompt timeout after ${this.config.timeout}ms`));
			}, this.config.timeout);

			this.pendingRequests.set(requestId, {
				resolve,
				reject,
				timer,
				type: 'prompt',
				isStreaming: stream,
				accumulatedContent: '',
				onStreamStart: streamOptions?.onStreamStart,
				onStreamChunk: streamOptions?.onStreamChunk,
			});

			this.send(message);
		});
	}

	/**
	 * Save content to vector database (Promise-based)
	 * @returns Promise that resolves to true if successful
	 */
	public async saveToVectorDB(nuri: string, content: string, vector?: number[]): Promise<boolean> {
		this.assertConnected();
		this.log('info', `Saving content to vector DB: "${nuri}"`);
		
		const requestId = this.generateRequestId();
		
		const message: ClientInboundMessage = {
			type: 'client/save_vector',
			requestId,
			sessionId: this.sessionId,
			nuri,
			content,
			vector,
		};

		return new Promise<boolean>((resolve, reject) => {
			// Set up timeout and track the request
			const timer = setTimeout(() => {
				this.pendingRequests.delete(requestId);
				reject(new Error(`Vector save timeout after ${this.config.timeout}ms`));
			}, this.config.timeout);

			this.pendingRequests.set(requestId, {
				resolve,
				reject,
				timer,
				type: 'vector_save',
			});

			this.send(message);
		});
	}

	/**
	 * Search vector database (Promise-based)
	 * @returns Promise that resolves to search results
	 */
	public async searchVectorDB(searchText: string, searchVector?: number[]): Promise<SingleVectorResult[]> {
		this.assertConnected();
		this.log('info', `Searching vector DB: "${searchText}"`);

		const requestId = this.generateRequestId();

		const message: ClientInboundMessage = {
			type: 'client/search_vector',
			requestId,
			sessionId: this.sessionId,
			search_text: searchText,
			search_vector: searchVector,
		};

		return new Promise<SingleVectorResult[]>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pendingRequests.delete(requestId);
				reject(new Error(`Vector search timeout after ${this.config.timeout}ms`));
			}, this.config.timeout);

			this.pendingRequests.set(requestId, {
				resolve,
				reject,
				timer,
				type: 'vector_search',
			});

			this.send(message);
		});
	}

	/**
	 * Request text embeddings from server (Promise-based)
	 * @returns Promise that resolves to embeddings array
	 */
	public async embedTexts(texts: string[]): Promise<number[][]> {
		this.assertConnected();
		this.log('info', `Requesting embeddings for ${texts.length} text(s)`);

		const requestId = this.generateRequestId();

		const message: ClientInboundMessage = {
			type: 'client/embed_texts',
			requestId,
			sessionId: this.sessionId,
			texts,
		};

		return new Promise<number[][]>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pendingRequests.delete(requestId);
				reject(new Error(`Embed texts timeout after ${this.config.timeout}ms`));
			}, this.config.timeout);

			this.pendingRequests.set(requestId, {
				resolve,
				reject,
				timer,
				type: 'embed_texts',
			});

			this.send(message);
		});
	}

	/**
	 * Close the WebSocket connection
	 */
	public close(): void {
		// Reject all pending requests before closing
		this.rejectAllPendingRequests(new Error('Connection closed'));
		
		this.ws?.close();
		this.isConnected = false;
	}

	/**
	 * Handle incoming messages from server
	 */
	private async handleMessage(message: ServerOutboundMessage): Promise<void> {
		this.log('info', `Received message: ${message.type}`);

		switch (message.type) {
			case 'server/session_started':
				this.handleSessionStarted(message);
				break;

			case 'server/tool_call':
				await this.handleToolCalls(message);
				break;

			case 'server/assistant_message':
				this.handleAssistantMessage(message);
				break;

			case 'server/stream_start':
				this.handleStreamStart(message);
				break;

			case 'server/stream_chunk':
				this.handleStreamChunk(message);
				break;

			case 'server/stream_end':
				this.handleStreamEnd(message);
				break;

			case 'server/vector_save_result':
				this.handleVectorSaveResult(message);
				break;

			case 'server/vector_search_result':
				this.handleVectorSearchResult(message);
				break;

			case 'server/tools_request':
				this.handleToolsRequest(message.sessionId);
				break;

			case 'server/embed_texts_result':
				this.handleEmbedTextsResult(message);
				break;

			case 'server/error':
				this.log('error', `Server error: ${message.error}`);
				
				// Reject all pending requests with this error
				this.rejectAllPendingRequests(new Error(message.error));
				
				this.events.onError?.(message.error);
				break;

			default:
				this.log('warn', `Unknown message type: ${JSON.stringify(message)}`);
				break;
		}
	}

	private handleSessionStarted(message: ServerSessionStarted): void {
		this.sessionId = message.sessionId;
		this.log('info', `Session started: ${this.sessionId}`);
		
		// Auto-send tools to server when session starts
		if (this.config.tools && this.config.tools.length > 0) {
			const toolsMessage: ClientInboundMessage = {
				type: 'client/update_tools',
				sessionId: this.sessionId,
				tools: this.config.tools,
			};
			this.send(toolsMessage);
			this.log('info', `Set ${this.config.tools.length} tools for session ${this.sessionId}`);
		}
		
		this.events.onSessionStarted?.(this.sessionId);
	}

	private async handleToolCalls(message: ServerToolCallRequest): Promise<void> {
		if (!this.config.toolHandler) {
			this.log('error', 'No tool handler configured');
			return;
		}

		this.log('info', `Executing ${message.toolCalls.length} tool call(s)`);
		// this.log('info', `Tool calls: ${JSON.stringify(message.toolCalls)}`);

		try {
			const results = await Promise.all(
				message.toolCalls.map(async (toolCall) => {
					try {
						const args = JSON.parse(toolCall.arguments);
						const result = await this.config.toolHandler!(toolCall.name, args);

						return {
							tool_call_id: toolCall.id,
							content: JSON.stringify(result),
						};
					} catch (error) {
						this.log('error', `Tool execution failed: ${toolCall.name}`, error);
						return {
							tool_call_id: toolCall.id,
							content: JSON.stringify({ 
								error: error instanceof Error ? error.message : 'Unknown error' 
							}),
						};
					}
				})
			);

			this.log('info', `Tool results: ${JSON.stringify(results)}`);
			this.sendToolResults(message.sessionId, results);
		} catch (error) {
			this.log('error', 'Failed to process tool calls:', error);
			this.events.onError?.(error as Error);
		}
	}

	private handleAssistantMessage(message: ServerAssistantMessage): void {
		this.log('info', `Assistant: ${message.content}`);
		
		// Resolve pending promise if exists
		if (message.requestId && this.pendingRequests.has(message.requestId)) {
			const request = this.pendingRequests.get(message.requestId)!;
			clearTimeout(request.timer);
			this.pendingRequests.delete(message.requestId);
			request.resolve(message.content);
		}
		
		// Also call event callback
		this.events.onAssistantMessage?.(message.content);
	}

	private handleStreamStart(message: ServerStreamStart): void {
		this.log('info', 'Stream started');
		
		// Initialize streaming state
		if (message.requestId && this.pendingRequests.has(message.requestId)) {
			const request = this.pendingRequests.get(message.requestId)!;
			request.accumulatedContent = '';
			
			// Call request-specific callback
			request.onStreamStart?.();
		}
		
		// Also call global event callback
		this.events.onStreamStart?.();
	}

	private handleStreamChunk(message: ServerStreamChunk): void {
		// Accumulate content for this request
		if (message.requestId && this.pendingRequests.has(message.requestId)) {
			const request = this.pendingRequests.get(message.requestId)!;
			request.accumulatedContent = (request.accumulatedContent || '') + message.delta;
			
			// Call request-specific callback
			request.onStreamChunk?.(message.delta, request.accumulatedContent);
		}
		
		// Also call global event callback (reconstruct accumulated from stored state)
		const request = message.requestId ? this.pendingRequests.get(message.requestId) : undefined;
		this.events.onStreamChunk?.(message.delta, request?.accumulatedContent || message.delta);
	}

	private handleStreamEnd(message: ServerStreamEnd): void {
		this.log('info', `Stream ended with content length: ${message.content.length}`);
		
		// Resolve pending promise if exists
		if (message.requestId && this.pendingRequests.has(message.requestId)) {
			const request = this.pendingRequests.get(message.requestId)!;
			clearTimeout(request.timer);
			this.pendingRequests.delete(message.requestId);
			request.resolve(message.content);
		}
		
		// Also call event callback
		this.events.onStreamEnd?.(message.content);
	}

	private handleVectorSaveResult(message: ServerVectorSaveResult): void {
		this.log('info', `Vector save result: ${message.success}`);
		
		// Resolve pending promise if exists
		if (message.requestId && this.pendingRequests.has(message.requestId)) {
			const request = this.pendingRequests.get(message.requestId)!;
			clearTimeout(request.timer);
			this.pendingRequests.delete(message.requestId);
			request.resolve(message.success);
		}
		
		// Also call event callback
		this.events.onVectorSaveResult?.(message.success);
	}

	private handleVectorSearchResult(message: ServerVectorSearchResult): void {
		this.log('info', `Vector search returned ${message.results.length} result(s)`);
		
		// Resolve pending promise if exists
		if (message.requestId && this.pendingRequests.has(message.requestId)) {
			const request = this.pendingRequests.get(message.requestId)!;
			clearTimeout(request.timer);
			this.pendingRequests.delete(message.requestId);
			request.resolve(message.results);
		}
		
		// Also call event callback for backward compatibility
		this.events.onVectorSearchResult?.(message.results);
	}

	private handleToolsRequest(sessionId?: string): void {
		const tools = this.config.tools || [];
		this.log('info', `Sending ${tools.length} tool(s) to server`);
		this.events.onToolsRequest?.();

		const message: ClientInboundMessage = {
			type: 'client/update_tools',
			sessionId: sessionId || this.sessionId,
			tools,
		};

		this.send(message);
	}

	private sendToolResults(sessionId: string, results: ToolResult[]): void {
		this.log('info', `Sending tool results for session ${sessionId}: ${results.length} results`);

		//console.log(`[ws-client] Sending tool results: ${JSON.stringify(results)}`);
		const message: ClientInboundMessage = {
			type: 'client/tool_result',
			sessionId,
			results,
		};

		this.send(message);
	}

	private send(message: ClientInboundMessage): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			throw new Error('WebSocket is not connected');
		}
		this.ws.send(JSON.stringify(message));
	}

	private assertConnected(): void {
		if (!this.connected) {
			throw new Error('Client is not connected. Call connect() first.');
		}
	}

	private log(level: 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
		if (this.config.logger) {
			this.config.logger[level](`[WSClient] ${message}`, ...args);
		}
	}

	private mergeExtraContext(extra_context?: string): string {
		if (!extra_context) {
			return this.config.system_extra_context || '';
		}
		return `${this.config.system_extra_context}\n\n${extra_context}`;
	}

	/**
	 * Generate a unique request ID for tracking
	 */
	private generateRequestId(): string {
		return `req_${++this.requestIdCounter}_${Date.now()}`;
	}

	/**
	 * Reject all pending requests (used on error or disconnect)
	 */
	private rejectAllPendingRequests(error: Error): void {
		for (const request of this.pendingRequests.values()) {
			clearTimeout(request.timer);
			request.reject(error);
		}
		this.pendingRequests.clear();
	}

	/**
	 * Handle embed texts result from server
	 */
	private handleEmbedTextsResult(message: any): void {
		this.log('info', `Received ${message.embeddings?.length || 0} embedding(s)`);
		
		// Resolve pending promise if exists
		if (message.requestId && this.pendingRequests.has(message.requestId)) {
			const request = this.pendingRequests.get(message.requestId)!;
			clearTimeout(request.timer);
			this.pendingRequests.delete(message.requestId);
			request.resolve(message.embeddings || []);
		}
	}
}

