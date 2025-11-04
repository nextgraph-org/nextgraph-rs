import OpenAI from 'openai';


export type ChatCompletionMessageParam = OpenAI.Chat.ChatCompletionMessageParam;

// CLIENT → SERVER
export interface ClientPrompt {
	type: 'client/prompt';
	requestId?: string;
	sessionId?: string;
	messages: ChatCompletionMessageParam[];
	agent_type?: string;
	extra_context?: string;
	stream?: boolean; // Enable streaming response
}

export interface ClientToolList {
	type: 'client/update_tools';
	sessionId?: string;
	tools: OpenAI.Chat.ChatCompletionTool[];
}

export interface ClientSaveVector {
	type: 'client/save_vector';
	requestId?: string;
	sessionId?: string;
	nuri: string;
	content: string;
	vector?: number[];
}

export interface ClientSearchVector {
	type: 'client/search_vector';
	requestId?: string;
	sessionId?: string;
	search_text: string;
	search_vector?: number[];
}

export interface ClientEmbedTexts {
	type: 'client/embed_texts';
	requestId?: string;
	sessionId?: string;
	texts: string[];
}

export interface ClientToolResult {
	type: 'client/tool_result';
	sessionId: string;
	results: ToolResult[];
}

export type ClientInboundMessage = ClientPrompt | ClientToolResult | ClientSaveVector | ClientSearchVector | ClientEmbedTexts | ClientToolList;

// SERVER → CLIENT
export interface ServerSessionStarted {
	type: 'server/session_started';
	sessionId: string;
}

export interface ServerToolCallRequest {
	type: 'server/tool_call';
	sessionId: string;
	toolCalls: {
		id: string;
		name: string;
		arguments: string; // JSON string per OpenAI schema
	}[];
}

export interface SingleVectorResult {
	id: string | number;
	nuri: string;
	score: number;
}

export interface ServerVectorSearchResult {
	type: 'server/vector_search_result';
	requestId?: string;
	sessionId: string;
	results: SingleVectorResult[];
}

export interface ServerVectorSaveResult {
	type: 'server/vector_save_result';
	requestId?: string;
	sessionId: string;
	success: boolean;
}

export interface ServerVectorEmbedResult {
	type: 'server/embed_texts_result';
	requestId?: string;
	sessionId: string;
	embeddings: number[][];
}

export interface ServerAssistantMessage {
	type: 'server/assistant_message';
	requestId?: string;
	sessionId: string;
	content: string;
}

export interface ServerStreamStart {
	type: 'server/stream_start';
	requestId?: string;
	sessionId: string;
}

export interface ServerStreamChunk {
	type: 'server/stream_chunk';
	requestId?: string;
	sessionId: string;
	delta: string; // New content chunk
}

export interface ServerStreamEnd {
	type: 'server/stream_end';
	requestId?: string;
	sessionId: string;
	content: string; // Full accumulated content
}

export interface ServerToolsRequest {
	type: 'server/tools_request';
	sessionId?: string;
}

export interface ServerErrorMessage {
	type: 'server/error';
	sessionId?: string;
	error: string;
}

export type ServerOutboundMessage =
	| ServerSessionStarted
	| ServerToolCallRequest
	| ServerAssistantMessage
	| ServerStreamStart
	| ServerStreamChunk
	| ServerStreamEnd
	| ServerToolsRequest
	| ServerVectorSearchResult
	| ServerVectorSaveResult
	| ServerVectorEmbedResult
	| ServerErrorMessage;

// Shared structures
export interface ToolResult {
	tool_call_id: string;
	content: string;
}