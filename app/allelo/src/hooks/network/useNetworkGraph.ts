import {useEffect, useMemo} from 'react';
import {useNetworkGraphStore} from '@/stores/networkGraphStore';
import {useNetworkViewStore} from '@/stores/networkViewStore';
import {mapContactsToNodes, addUserNode} from '@/utils/networkMapper';
import {GraphNode, GraphEdge} from '@/types/network';
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {ShortSocialContact} from "@/.orm/shapes/shortcontact.typings.ts";

interface UseNetworkGraphOptions {
  userId?: string;
  userName?: string;
  contacts: ShortSocialContact[];
}

const buildUserNetwork = (
  contacts: SocialContact[],
  centeredNodeId: string | null,
  userId: string,
  userName: string
) => {
  const sortedContacts = [...contacts]

  const contactNodes = mapContactsToNodes(sortedContacts, centeredNodeId || undefined);
  const userNode = addUserNode(userId, userName);
  userNode.isCentered = !centeredNodeId || centeredNodeId === userId;
  const allNodes: GraphNode[] = [userNode, ...contactNodes];

  const userEdges: GraphEdge[] = sortedContacts.map((contact) => {
    let relationship: string | undefined;

    /*if (contact.relationshipCategory) {//TODO use rcards
      const categoryMap: Record<string, string> = {
        'friends_family': 'friend',
        'community': 'community',
        'business': 'business contact',
      };
      relationship = categoryMap[contact.relationshipCategory] || contact.relationshipCategory;
    } else */
    /*TODO    if (contact.organization && contact.organization.size > 0) {
          const orgArray = Array.from(contact.organization);
          const currentOrg = orgArray.find((o) => o.current);
          relationship = currentOrg ? 'colleague' : 'former colleague';
        } else if (contact.relation && contact.relation.size > 0) {
          const relArray = Array.from(contact.relation);
          const firstRel = relArray[0];
          relationship = firstRel.type2?.['@id'] || 'relation';
        }*/

    return {
      id: `${userId}-${contact['@id']}`,
      source: userId,
      target: contact['@id'] || '',
      type: 'confirmed' as const,
      strength: 0.8,
      relationship,
    };
  });

  const nodesWithPriorities = allNodes.map((node) => ({
    ...node,
    priority: node.id === userId ? ('high' as const) : node.priority,
  }));

  return {nodes: nodesWithPriorities, edges: userEdges};
};

export const useNetworkGraph = ({
                                  userId = 'me',
                                  userName = 'ME',
                                  contacts = [],
                                }: UseNetworkGraphOptions) => {

  // Use selectors to avoid subscribing to the entire store
  const setNodes = useNetworkGraphStore(state => state.setNodes);
  const setEdges = useNetworkGraphStore(state => state.setEdges);
  const centeredNodeId = useNetworkGraphStore(state => state.centeredNodeId);
  const setAvailableViews = useNetworkViewStore(state => state.setAvailableViews);

  // Separate the base graph generation from view-specific filtering
  // This prevents unnecessary recalculation when only the view changes
  const baseGraphData = useMemo(() => {
    if (!contacts || contacts.length === 0) {
      return {nodes: [], edges: [], centeredNodeId: null, graphType: 'empty' as const};
    }

    const result = buildUserNetwork(contacts, centeredNodeId, userId, userName);
    return {...result, centeredNodeId, graphType: 'user' as const};
  }, [contacts, centeredNodeId, userId, userName]);

  // Apply view-specific filtering without recalculating the entire graph
  const {nodes, edges} = useMemo(() => {
    if (baseGraphData.graphType === 'empty') {
      return {nodes: [], edges: []};
    }

    return {nodes: baseGraphData.nodes, edges: baseGraphData.edges};
  }, [baseGraphData]);

  useEffect(() => {
    // Always update nodes when they change to ensure we replace the full node set
    setNodes(nodes);
  }, [nodes, setNodes]);

  useEffect(() => {
    // Always update edges when they change to ensure we replace the full edge set
    setEdges(edges);
  }, [edges, setEdges]);

  useEffect(() => {
    if (!centeredNodeId || centeredNodeId === userId) {
      setAvailableViews(['all-connections']);
    } else if (centeredNodeId.startsWith('org-') || centeredNodeId.startsWith('proj-') || centeredNodeId.startsWith('edu-')) {
      setAvailableViews(['all-connections']);
    } else {
      const centeredContact = contacts.find((c) => c['@id'] === centeredNodeId);
      if (centeredContact) {
        const views: ('work-history' | 'orgs-in-common' | 'people-in-common' | 'all-connections')[] = [];
        views.push('people-in-common');
        views.push('all-connections');
        setAvailableViews(views);
      }
    }
  }, [centeredNodeId, userId, contacts, setAvailableViews]);

  // No longer return isLoading since we don't manage loading state here
  // Loading is handled by the probes in ContactNetworkTab
};
