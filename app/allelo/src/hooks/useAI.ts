import {useCallback, useEffect, useState} from 'react';
import {WSClient, tools, ChatCompletionMessageParam} from '@/lib/ws-ai-client';
import {nextgraphDataService} from "@/services/nextgraphDataService.ts";
import {useNextGraphAuth} from '@/lib/nextgraph';
import {NextGraphAuth} from "@/types/nextgraph.ts";
import { WS_AI_URL, schemaStructure } from '@/config/aiApi.ts';

interface UseAIReturn {
  promptNonStream: (messages: ChatCompletionMessageParam[]) => Promise<string>;
  promptStream: (
    messages: ChatCompletionMessageParam[],
    onStreamStart?: () => void,
    onStreamChunk?: (delta: string, accumulated: string) => void,
    onStreamEnd?: (content: string) => void
  ) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

export function useAI(isMock?: boolean): UseAIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<WSClient | null>(null);

  const nextGraphAuth = useNextGraphAuth();
  const {session} = nextGraphAuth as any as NextGraphAuth;

  // Tool execution handler
  const executeTool = useCallback(async (name: string, args: any): Promise<any> => {
    if (!session) {
      return { error: 'No active session available' };
    }

    console.log("Executing tool: ", name);
    console.log("Args: ", args);

    switch (name) {
    	case 'get_contact_by_nuri':

        console.log("Getting contact by nuri: ", args.nuri);
    		return await nextgraphDataService.getContactAllProperties(session, args.nuri);

    	// case 'find_group_members_by_id':
    	// 	{
    	// 		const group = await nextgraphDataService.getItemById(args.id);
    	// 		if (!group) return { error: `Group not found: ${args.id}` };
    	// 		const members = group.memberIds?.map(async (m: any) => await nextgraphDataService.getItemById(m, args.properties || []));
    	// 		return members || [];
    	// 	}

    	// case 'find_group_members_by_name':
    	// 	{
    	// 		const group = await nextgraphDataService.getGroupByName(args.name);
    	// 		if (!group) return { error: `Group not found: ${args.name}` };
    	// 		const members = group.memberIds?.map(async (m: any) => await nextgraphDataService.getItemById(m.id, args.properties || []));
    	// 		return members || [];
    	// 	}

    	case 'search_contacts':
        {
          const limit = 10;
          const offset = 0;
          const sortBy = 'name';
          const sortDirection = 'asc';
          const filterParams = new Map<string, string>();
          filterParams.set('fts', args.value);

          console.log("session", session);
          console.log("Searching contacts with params", args.value);

          const contactIDsResult = await nextgraphDataService.getContactIDs(session, limit, offset,
              undefined, undefined, [{sortBy, sortDirection}], filterParams);

          console.log("Contact IDs Result: ", contactIDsResult, contactIDsResult.results);
          const containerOverlay = session.privateStoreId!.substring(46);
          const nuris = contactIDsResult?.results?.bindings?.map(
              (binding) => binding.contactUri.value + containerOverlay
          );

          const contacts = nuris?.map( async (nuri) => {
            const contact = await nextgraphDataService.getContactAllProperties(session, nuri);
            return contact;
          })
          return contacts;
        }
        
    	// case 'search_groups_by_property':
    	// 	return await nextgraphDataService.search_groups(args.property, args.value);

    	default:
    		return { error: `Unknown tool: ${name}` };
    }
  }, []);

  const setupClient = useCallback(async () => {
    console.log(`Connecting to ${WS_AI_URL}...\n`);

    // Create client with configuration
    console.log("TOOLS: ", tools);

    let client;
    client = new WSClient({
      url: WS_AI_URL,
      toolHandler: executeTool,
      tools: tools,
      logger: {
        info: console.log,
        warn: console.log,
        error: console.error
      },
      system_extra_context: schemaStructure
    });

    // Register event callbacks
    client.on({
      onSessionStarted: (sessionId) => {
        console.log(`Session started: ${sessionId}`);
      },
      onError: (error) => {
        console.log('Error:', error);
      },
      onDisconnected: () => {
        console.warn('Disconnected from server');
      }
    });

    // Connect to server
    await client.connect();
    console.log('Connected to server!');

    setClient(client);
    return client;
  }, [executeTool, isMock]);

  const promptNonStream = useCallback(async (messages: ChatCompletionMessageParam[]) => {
    if (!client) {
      throw new Error('Client not connected');
    }
    return await client.sendPrompt(messages);
  }, [client]);

  const promptStream = useCallback(async (
    messages: ChatCompletionMessageParam[],
    onStreamStart?: () => void,
    onStreamChunk?: (delta: string, accumulated: string) => void,
    onStreamEnd?: (content: string) => void
  ): Promise<string> => {
    if (!client) {
      throw new Error('Client not connected');
    }
    return client.sendPromptStreaming(messages, {
      onStreamStart,
      onStreamChunk,
      onStreamEnd
    });
  }, [client]);

  useEffect(() => {
    setupClient();
  }, [setupClient]);

  return {
    promptNonStream,
    promptStream,
    isLoading: false,
    error: null
  };
}

