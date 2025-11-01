import { useEffect, useMemo } from 'react';
import { useContacts } from '@/hooks/contacts/useContacts';
import { useNetworkGraphStore } from '@/stores/networkGraphStore';
import { useNetworkViewStore } from '@/stores/networkViewStore';
import { mapContactsToNodes, addUserNode } from '@/utils/networkMapper';
import { calculateNetworkCentrality } from '@/utils/networkCentrality';
import { GraphNode, GraphEdge } from '@/types/network';
import { resolveFrom } from '@/utils/socialContact/contactUtils';
import { Contact } from '@/types/contact';

interface UseNetworkGraphOptions {
  userId?: string;
  userName?: string;
  maxNodes?: number;
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

const buildUserNetwork = (
  contacts: Contact[],
  centeredNodeId: string | null,
  userId: string,
  userName: string,
  maxNodes: number
) => {
  const sortedContacts = [...contacts]
    .sort((a, b) => {
      const aScore =
        (a.interactionCount || 0) * 10 + ((a.vouchesSent || 0) + (a.vouchesReceived || 0)) * 5;
      const bScore =
        (b.interactionCount || 0) * 10 + ((b.vouchesSent || 0) + (b.vouchesReceived || 0)) * 5;
      return bScore - aScore;
    })
    .slice(0, maxNodes - 1);

  const contactNodes = mapContactsToNodes(sortedContacts, centeredNodeId || undefined);
  const userNode = addUserNode(userId, userName);
  userNode.isCentered = !centeredNodeId || centeredNodeId === userId;
  const allNodes: GraphNode[] = [userNode, ...contactNodes];

  const userEdges: GraphEdge[] = sortedContacts.map((contact) => {
    let relationship: string | undefined;

    if (contact.relationshipCategory) {
      const categoryMap: Record<string, string> = {
        'friends_family': 'friend',
        'community': 'community',
        'business': 'business contact',
      };
      relationship = categoryMap[contact.relationshipCategory] || contact.relationshipCategory;
    } else if (contact.organization && contact.organization.size > 0) {
      const orgArray = Array.from(contact.organization);
      const currentOrg = orgArray.find((o) => o.current);
      relationship = currentOrg ? 'colleague' : 'former colleague';
    } else if (contact.relation && contact.relation.size > 0) {
      const relArray = Array.from(contact.relation);
      const firstRel = relArray[0];
      relationship = firstRel.type2?.['@id'] || 'relation';
    }

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

  const centralityScores = calculateNetworkCentrality(nodesWithPriorities, userEdges, userId);

  const nodesWithCentrality = nodesWithPriorities.map((node) => ({
    ...node,
    centrality: centralityScores.get(node.id) || 0,
  }));

  return { nodes: nodesWithCentrality, edges: userEdges };
};

const buildEntityNetwork = (
  entityId: string,
  entityName: string,
  entityType: 'org' | 'proj' | 'edu',
  allContacts: Contact[],
  userId: string,
  userName: string
) => {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const centeredNode: GraphNode = {
    id: entityId,
    type: 'entity',
    name: entityName,
    initials: getInitials(entityName),
    isCentered: true,
    priority: 'high',
  };
  nodes.push(centeredNode);

  const meNode = addUserNode(userId, userName);
  meNode.isCentered = false;
  meNode.priority = 'high';
  let isMeConnected = false;

  const connectedContacts: Contact[] = [];

  allContacts.forEach((contact) => {
    let isConnected = false;
    let relationship = 'connection';
    let edgeType: 'confirmed' | 'weak' = 'confirmed';

    if (entityType === 'org' && contact.organization) {
      const orgArray = Array.from(contact.organization);
      const matchingOrg = orgArray.find((o) => o.value === entityName);
      if (matchingOrg) {
        isConnected = true;
        relationship = matchingOrg.current ? 'works at' : 'worked at';
        edgeType = matchingOrg.current ? 'confirmed' : 'weak';
      }
    } else if (entityType === 'proj' && contact.project) {
      const projArray = Array.from(contact.project);
      if (projArray.some((p) => p.value === entityName)) {
        isConnected = true;
        relationship = 'founder';
        edgeType = 'confirmed';
      }
    } else if (entityType === 'edu' && contact.education) {
      const eduArray = Array.from(contact.education);
      if (eduArray.some((e) => e.value === entityName)) {
        isConnected = true;
        relationship = 'attended';
        edgeType = 'weak';
      }
    }

    if (isConnected) {
      connectedContacts.push(contact);

      const contactName = resolveFrom(contact, 'name');
      const contactPhoto = resolveFrom(contact, 'photo');
      const contactNameValue = contactName?.value || 'Unknown';

      nodes.push({
        id: contact['@id'] || contactNameValue,
        type: 'person',
        name: contactNameValue,
        avatar: contactPhoto?.value,
        initials: getInitials(contactNameValue),
        isCentered: false,
        priority: 'high',
      });

      edges.push({
        id: `${entityId}-${contact['@id']}`,
        source: entityId,
        target: contact['@id'] || '',
        type: edgeType,
        strength: edgeType === 'confirmed' ? 0.8 : 0.5,
        relationship,
      });

      if (contact['@id'] === userId) {
        isMeConnected = true;
      }
    }
  });

  if (isMeConnected || connectedContacts.length === 0) {
    nodes.push(meNode);
    if (!edges.find((e) => e.target === userId || e.source === userId)) {
      edges.push({
        id: `${entityId}-${userId}`,
        source: entityId,
        target: userId,
        type: 'weak',
        strength: 0.5,
        relationship: entityType === 'org' ? 'organization' : entityType === 'proj' ? 'project' : 'education',
      });
    }
  }

  const centralityScores = calculateNetworkCentrality(nodes, edges, entityId);
  const nodesWithCentrality = nodes.map((node) => ({
    ...node,
    centrality: centralityScores.get(node.id) || 0,
  }));

  return { nodes: nodesWithCentrality, edges };
};

const buildContactNetwork = (
  centeredContact: Contact,
  allContacts: Contact[],
  userId: string,
  userName: string,
  currentView: 'work-history' | 'orgs-in-common' | 'people-in-common' | 'all-connections' | null
) => {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const centeredName = resolveFrom(centeredContact, 'name');
  const centeredPhoto = resolveFrom(centeredContact, 'photo');
  const centeredNameValue = centeredName?.value || 'Unknown';

  const centeredNode: GraphNode = {
    id: centeredContact['@id'] || centeredNameValue,
    type: 'person',
    name: centeredNameValue,
    avatar: centeredPhoto?.value,
    initials: getInitials(centeredNameValue),
    isCentered: true,
    priority: 'high',
  };
  nodes.push(centeredNode);

  const meNode = addUserNode(userId, userName);
  meNode.isCentered = false;
  meNode.priority = 'high';
  nodes.push(meNode);

  edges.push({
    id: `${centeredNode.id}-${userId}`,
    source: centeredNode.id,
    target: userId,
    type: 'confirmed',
    strength: 0.8,
    relationship: centeredContact.relationshipCategory || 'connection',
  });

  const showWorkHistory = !currentView || currentView === 'all-connections' || currentView === 'work-history' || currentView === 'orgs-in-common';
  const showProjects = !currentView || currentView === 'all-connections';
  const showEducation = !currentView || currentView === 'all-connections';
  const showPeopleInCommon = currentView === 'people-in-common' || currentView === 'all-connections';

  if (showWorkHistory && centeredContact.organization && centeredContact.organization.size > 0) {
    const orgArray = Array.from(centeredContact.organization);
    orgArray.forEach((org) => {
      const orgName = org.value || '';
      if (!orgName) return;

      const orgId = `org-${orgName.replace(/\s+/g, '-').toLowerCase()}`;

      if (!nodes.find((n) => n.id === orgId)) {
        nodes.push({
          id: orgId,
          type: 'entity',
          name: orgName,
          initials: getInitials(orgName),
          isCentered: false,
          priority: org.current ? 'high' : 'medium',
        });
      }

      edges.push({
        id: `${centeredNode.id}-${orgId}`,
        source: centeredNode.id,
        target: orgId,
        type: org.current ? 'confirmed' : 'weak',
        strength: org.current ? 0.9 : 0.5,
        relationship: org.current ? 'works at' : 'worked at',
      });
    });
  }

  if (showProjects && centeredContact.project && centeredContact.project.size > 0) {
    const projArray = Array.from(centeredContact.project);
    projArray.forEach((proj) => {
      const projName = proj.value || '';
      if (!projName) return;

      const projId = `proj-${projName.replace(/\s+/g, '-').toLowerCase()}`;

      if (!nodes.find((n) => n.id === projId)) {
        nodes.push({
          id: projId,
          type: 'entity',
          name: projName,
          initials: getInitials(projName),
          isCentered: false,
          priority: 'high',
        });
      }

      edges.push({
        id: `${centeredNode.id}-${projId}`,
        source: centeredNode.id,
        target: projId,
        type: 'confirmed',
        strength: 0.8,
        relationship: 'founder',
      });
    });
  }

  if (showEducation && centeredContact.education && centeredContact.education.size > 0) {
    const eduArray = Array.from(centeredContact.education);
    eduArray.slice(0, 3).forEach((edu) => {
      const eduName = edu.value || '';
      if (!eduName) return;

      const eduId = `edu-${eduName.replace(/\s+/g, '-').toLowerCase()}`;

      if (!nodes.find((n) => n.id === eduId)) {
        nodes.push({
          id: eduId,
          type: 'entity',
          name: eduName,
          initials: getInitials(eduName),
          isCentered: false,
          priority: 'low',
        });
      }

      edges.push({
        id: `${centeredNode.id}-${eduId}`,
        source: centeredNode.id,
        target: eduId,
        type: 'weak',
        strength: 0.4,
        relationship: 'attended',
      });
    });
  }

  if (showPeopleInCommon) {
    const sortedContacts = [...allContacts]
      .filter((c) => c['@id'] !== centeredContact['@id'] && c['@id'] !== userId)
      .sort((a, b) => {
        const aScore =
          (a.interactionCount || 0) * 10 + ((a.vouchesSent || 0) + (a.vouchesReceived || 0)) * 5;
        const bScore =
          (b.interactionCount || 0) * 10 + ((b.vouchesSent || 0) + (b.vouchesReceived || 0)) * 5;
        return bScore - aScore;
      })
      .slice(0, 5);

    sortedContacts.forEach((contact) => {
      const contactName = resolveFrom(contact, 'name');
      const contactPhoto = resolveFrom(contact, 'photo');
      const contactNameValue = contactName?.value || 'Unknown';

      if (!nodes.find((n) => n.id === contact['@id'])) {
        nodes.push({
          id: contact['@id'] || contactNameValue,
          type: 'person',
          name: contactNameValue,
          avatar: contactPhoto?.value,
          initials: getInitials(contactNameValue),
          isCentered: false,
          priority: 'medium',
        });

        edges.push({
          id: `${centeredNode.id}-${contact['@id']}`,
          source: centeredNode.id,
          target: contact['@id'] || '',
          type: 'weak',
          strength: 0.5,
          relationship: 'connection',
        });
      }
    });
  }

  const centralityScores = calculateNetworkCentrality(nodes, edges, centeredNode.id);
  const nodesWithCentrality = nodes.map((node) => ({
    ...node,
    centrality: centralityScores.get(node.id) || 0,
  }));

  return { nodes: nodesWithCentrality, edges };
};

export const useNetworkGraph = ({
  userId = 'me',
  userName = 'ME',
  maxNodes = 30,
}: UseNetworkGraphOptions = {}) => {
  const { contacts, isLoading: contactsLoading } = useContacts({ limit: 0 });
  const { setNodes, setEdges, centeredNodeId } = useNetworkGraphStore();
  const { setAvailableViews, currentView } = useNetworkViewStore();

  const { nodes, edges } = useMemo(() => {
    if (!contacts || contacts.length === 0) {
      return { nodes: [], edges: [] };
    }

    if (centeredNodeId && centeredNodeId !== userId) {
      if (centeredNodeId.startsWith('org-') || centeredNodeId.startsWith('proj-') || centeredNodeId.startsWith('edu-')) {
        const entityType = centeredNodeId.startsWith('org-') ? 'org' : centeredNodeId.startsWith('proj-') ? 'proj' : 'edu';

        let entityName = '';
        for (const contact of contacts) {
          if (entityType === 'org' && contact.organization) {
            const orgArray = Array.from(contact.organization);
            for (const org of orgArray) {
              const orgId = `org-${org.value?.replace(/\s+/g, '-').toLowerCase()}`;
              if (orgId === centeredNodeId) {
                entityName = org.value || '';
                break;
              }
            }
          } else if (entityType === 'proj' && contact.project) {
            const projArray = Array.from(contact.project);
            for (const proj of projArray) {
              const projId = `proj-${proj.value?.replace(/\s+/g, '-').toLowerCase()}`;
              if (projId === centeredNodeId) {
                entityName = proj.value || '';
                break;
              }
            }
          } else if (entityType === 'edu' && contact.education) {
            const eduArray = Array.from(contact.education);
            for (const edu of eduArray) {
              const eduId = `edu-${edu.value?.replace(/\s+/g, '-').toLowerCase()}`;
              if (eduId === centeredNodeId) {
                entityName = edu.value || '';
                break;
              }
            }
          }
          if (entityName) break;
        }

        if (entityName) {
          return buildEntityNetwork(centeredNodeId, entityName, entityType, contacts, userId, userName);
        }
      } else {
        const centeredContact = contacts.find((c) => c['@id'] === centeredNodeId);
        if (centeredContact) {
          return buildContactNetwork(centeredContact, contacts, userId, userName, currentView);
        }
      }
    }

    return buildUserNetwork(contacts, centeredNodeId, userId, userName, maxNodes);
  }, [contacts, centeredNodeId, userId, userName, maxNodes, currentView]);

  useEffect(() => {
    if (nodes.length > 0) {
      const currentNodes = useNetworkGraphStore.getState().nodes;
      const nodeCountChanged = currentNodes.length !== nodes.length;
      const nodeStructureChanged = nodeCountChanged || nodes.some((n, i) => {
        const current = currentNodes[i];
        return !current || current.id !== n.id || current.type !== n.type;
      });

      if (nodeStructureChanged) {
        setNodes(nodes);
      }
    }
  }, [nodes, setNodes]);

  useEffect(() => {
    if (edges.length > 0) {
      const currentEdges = useNetworkGraphStore.getState().edges;
      const edgeCountChanged = currentEdges.length !== edges.length;
      const edgeStructureChanged = edgeCountChanged || edges.some((e, i) => {
        const current = currentEdges[i];
        return !current || current.id !== e.id;
      });

      if (edgeStructureChanged) {
        setEdges(edges);
      }
    }
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

        if (centeredContact.organization && centeredContact.organization.size > 0) {
          views.push('work-history');
          views.push('orgs-in-common');
        }

        views.push('people-in-common');
        views.push('all-connections');

        setAvailableViews(views);
      }
    }
  }, [centeredNodeId, userId, contacts, setAvailableViews]);

  return {
    nodes,
    edges,
    isLoading: contactsLoading,
  };
};
