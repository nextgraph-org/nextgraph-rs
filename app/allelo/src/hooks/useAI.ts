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
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);
  const [client, setClient] = useState<WSClient | null>(null);

  const nextGraphAuth = useNextGraphAuth();
  const {session} = nextGraphAuth as any as NextGraphAuth;

  // Tool execution handler
  const executeTool = useCallback(async (name: string, args: any): Promise<any> => {
    if (!session) {
      return { error: 'No active session available' };
    }

    console.log("Executing tool: ", name, "with args: ", args);

    const getContactAllProperties = async (nuri: string) => {
      const contactResult = await nextgraphDataService.getContactAllProperties(session!, nuri);
      const contact = contactResult?.results?.bindings?.map((binding) => `${binding.mainProperty.value}, ${binding.subProperty.value}, ${binding.value.value}`).join('\n');
      return `\n\nSubject, Predicate, Object\n${contact}\n\n`;
    }

    switch (name) {
    	case 'get_contact_by_nuri':
    		return await getContactAllProperties(args.nuri);

    	case 'search_contacts':
        {
          const limit = 10;
          const offset = 0;
          const sortBy = 'name';
          const sortDirection = 'asc';
          const filterParams = new Map<string, string>();
          filterParams.set('fts', args.value);

          console.log("Searching contacts with params", args.value);
          const contactIDsResult = await nextgraphDataService.getContactIDs(session, limit, offset,
              undefined, undefined, [{sortBy, sortDirection}], filterParams);

          console.log("Found contacts: ", contactIDsResult?.results?.bindings?.length);
          // const containerOverlay = session.privateStoreId!.substring(46);
          const nuris = contactIDsResult?.results?.bindings?.map(
              (binding) => binding.contactUri.value // + containerOverlay
          );

          if (!nuris) {
            return 'No contacts found';
          }

          const contacts = await Promise.all(
            nuris.map((nuri) => getContactAllProperties(nuri))
          );
          return contacts.join('\n');
        }
        
    	default:
    		return `Unknown tool: ${name}`;
    }
  }, [session]);

  const setupClient = useCallback(async () => {
    console.log(`Connecting to ${WS_AI_URL}...\n`);

    // Create client with configuration
    console.log("TOOLS: ", tools);

    const client = new WSClient({
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
    isLoading: isLoading,
    error: error
  };
}

