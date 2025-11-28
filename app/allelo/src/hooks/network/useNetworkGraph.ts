import { useEffect, useMemo } from 'react';
import { useNetworkGraphStore } from '@/stores/networkGraphStore';
import { useNetworkViewStore } from '@/stores/networkViewStore';
import { mapContactsToNodes, addUserNode } from '@/utils/networkMapper';
import { GraphNode, GraphEdge } from '@/types/network';
import { resolveFrom } from '@/utils/socialContact/contactUtils';
import { Contact } from '@/types/contact';
import { defaultTemplates, renderTemplate } from '@/utils/templateRenderer';

interface UseNetworkGraphOptions {
  userId?: string;
  userName?: string;
  contacts: Contact[]; // Accept contacts as input instead of fetching
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
  userName: string
) => {
  const sortedContacts = [...contacts]
    .sort((a, b) => {
      const aCentrality = a.centralityScore || 0;
      const bCentrality = b.centralityScore || 0;

      const aScore =
        aCentrality +
        (a.interactionCount || 0) * 10 +
        ((a.vouchesSent || 0) + (a.vouchesReceived || 0)) * 5;
      const bScore =
        bCentrality +
        (b.interactionCount || 0) * 10 +
        ((b.vouchesSent || 0) + (b.vouchesReceived || 0)) * 5;
      return bScore - aScore;
    });

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
    if (contact.organization && contact.organization.size > 0) {
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

  return { nodes: nodesWithPriorities, edges: userEdges };
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

      let contactName = resolveFrom(contact, 'name');
      // Handle Set-like object or array when resolveFrom returns undefined
      if (!contactName && contact.name) {
        const nameArray = typeof contact.name === 'object' && 'toArray' in contact.name
          ? (contact.name as any).toArray()
          : Array.isArray(contact.name)
          ? contact.name
          : [contact.name];
        if (nameArray.length > 0) {
          contactName = nameArray.find((n: any) => n.selected || n.preferred) || nameArray[0];
        }
      }
      const contactPhoto = resolveFrom(contact, 'photo');
      const contactNameValue = contactName?.value || renderTemplate(defaultTemplates.contactName, contactName) || 'Unknown';

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

  return { nodes, edges };
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

  let centeredName = resolveFrom(centeredContact, 'name');
  // Handle Set-like object or array when resolveFrom returns undefined
  if (!centeredName && centeredContact.name) {
    const nameArray = typeof centeredContact.name === 'object' && 'toArray' in centeredContact.name
      ? (centeredContact.name as any).toArray()
      : Array.isArray(centeredContact.name)
      ? centeredContact.name
      : [centeredContact.name];
    if (nameArray.length > 0) {
      centeredName = nameArray.find((n: any) => n.selected || n.preferred) || nameArray[0];
    }
  }
  const centeredPhoto = resolveFrom(centeredContact, 'photo');
  const centeredNameValue = centeredName?.value || renderTemplate(defaultTemplates.contactName, centeredName) || 'Unknown';

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
    relationship: /*centeredContact.relationshipCategory || */'connection',
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

      // Find other contacts who belong to this organization
      const orgContacts = allContacts.filter((c) => {
        if (c['@id'] === centeredContact['@id']) return false;
        if (!c.organization) return false;
        const contactOrgArray = Array.from(c.organization);
        return contactOrgArray.some((o) => o.value === orgName);
      });

      orgContacts.forEach((contact) => {
        let contactName = resolveFrom(contact, 'name');
        if (!contactName && contact.name) {
          const nameArray = typeof contact.name === 'object' && 'toArray' in contact.name
            ? (contact.name as any).toArray()
            : Array.isArray(contact.name)
            ? contact.name
            : [contact.name];
          if (nameArray.length > 0) {
            contactName = nameArray.find((n: any) => n.selected || n.preferred) || nameArray[0];
          }
        }
        const contactPhoto = resolveFrom(contact, 'photo');
        const contactNameValue = contactName?.value || renderTemplate(defaultTemplates.contactName, contactName) || 'Unknown';

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
        }

        // Connect the contact to the organization
        if (!edges.find((e) => e.id === `${contact['@id']}-${orgId}`)) {
          edges.push({
            id: `${contact['@id']}-${orgId}`,
            source: contact['@id'] || '',
            target: orgId,
            type: 'weak',
            strength: 0.6,
            relationship: 'colleague',
          });
        }
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

      // Find other contacts who belong to this project
      const projContacts = allContacts.filter((c) => {
        if (c['@id'] === centeredContact['@id']) return false;
        if (!c.project) return false;
        const contactProjArray = Array.from(c.project);
        return contactProjArray.some((p) => p.value === projName);
      });

      projContacts.forEach((contact) => {
        let contactName = resolveFrom(contact, 'name');
        if (!contactName && contact.name) {
          const nameArray = typeof contact.name === 'object' && 'toArray' in contact.name
            ? (contact.name as any).toArray()
            : Array.isArray(contact.name)
            ? contact.name
            : [contact.name];
          if (nameArray.length > 0) {
            contactName = nameArray.find((n: any) => n.selected || n.preferred) || nameArray[0];
          }
        }
        const contactPhoto = resolveFrom(contact, 'photo');
        const contactNameValue = contactName?.value || renderTemplate(defaultTemplates.contactName, contactName) || 'Unknown';

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
        }

        if (!edges.find((e) => e.id === `${contact['@id']}-${projId}`)) {
          edges.push({
            id: `${contact['@id']}-${projId}`,
            source: contact['@id'] || '',
            target: projId,
            type: 'weak',
            strength: 0.6,
            relationship: 'collaborator',
          });
        }
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

      // Find other contacts who attended this school
      const eduContacts = allContacts.filter((c) => {
        if (c['@id'] === centeredContact['@id']) return false;
        if (!c.education) return false;
        const contactEduArray = Array.from(c.education);
        return contactEduArray.some((e) => e.value === eduName);
      });

      eduContacts.forEach((contact) => {
        let contactName = resolveFrom(contact, 'name');
        if (!contactName && contact.name) {
          const nameArray = typeof contact.name === 'object' && 'toArray' in contact.name
            ? (contact.name as any).toArray()
            : Array.isArray(contact.name)
            ? contact.name
            : [contact.name];
          if (nameArray.length > 0) {
            contactName = nameArray.find((n: any) => n.selected || n.preferred) || nameArray[0];
          }
        }
        const contactPhoto = resolveFrom(contact, 'photo');
        const contactNameValue = contactName?.value || renderTemplate(defaultTemplates.contactName, contactName) || 'Unknown';

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
        }

        if (!edges.find((e) => e.id === `${contact['@id']}-${eduId}`)) {
          edges.push({
            id: `${contact['@id']}-${eduId}`,
            source: contact['@id'] || '',
            target: eduId,
            type: 'weak',
            strength: 0.4,
            relationship: 'alumni',
          });
        }
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
      let contactName = resolveFrom(contact, 'name');
      // Handle Set-like object or array when resolveFrom returns undefined
      if (!contactName && contact.name) {
        const nameArray = typeof contact.name === 'object' && 'toArray' in contact.name
          ? (contact.name as any).toArray()
          : Array.isArray(contact.name)
          ? contact.name
          : [contact.name];
        if (nameArray.length > 0) {
          contactName = nameArray.find((n: any) => n.selected || n.preferred) || nameArray[0];
        }
      }
      const contactPhoto = resolveFrom(contact, 'photo');
      const contactNameValue = contactName?.value || renderTemplate(defaultTemplates.contactName, contactName) || 'Unknown';

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

  return { nodes, edges };
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
  const currentView = useNetworkViewStore(state => state.currentView);
  const activeFilters = useNetworkViewStore(state => state.activeFilters);

  // Separate the base graph generation from view-specific filtering
  // This prevents unnecessary recalculation when only the view changes
  const baseGraphData = useMemo(() => {
    if (!contacts || contacts.length === 0) {
      return { nodes: [], edges: [], centeredNodeId: null, graphType: 'empty' as const };
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
          const result = buildEntityNetwork(centeredNodeId, entityName, entityType, contacts, userId, userName);
          return { ...result, centeredNodeId, graphType: 'entity' as const };
        }
      } else {
        const centeredContact = contacts.find((c) => c['@id'] === centeredNodeId);
        if (centeredContact) {
          return { centeredContact, centeredNodeId, graphType: 'contact' as const, nodes: [], edges: [] };
        }
      }
    }

    const result = buildUserNetwork(contacts, centeredNodeId, userId, userName);
    return { ...result, centeredNodeId, graphType: 'user' as const };
  }, [contacts, centeredNodeId, userId, userName]);

  // Apply view-specific filtering without recalculating the entire graph
  const { nodes, edges } = useMemo(() => {
    if (baseGraphData.graphType === 'empty') {
      return { nodes: [], edges: [] };
    }

    if (baseGraphData.graphType === 'contact' && baseGraphData.centeredContact) {
      return buildContactNetwork(baseGraphData.centeredContact, contacts, userId, userName, currentView);
    }

    let filteredEdges = baseGraphData.edges;

    // Apply relationship filtering if active
    const relationshipFilter = activeFilters.relationships;
    if (relationshipFilter && relationshipFilter.length > 0) {
      filteredEdges = baseGraphData.edges.filter(edge =>
        edge.relationship && relationshipFilter.includes(edge.relationship)
      );

      // Get nodes that are still connected after filtering
      const connectedNodeIds = new Set<string>();
      filteredEdges.forEach(edge => {
        const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        connectedNodeIds.add(sourceId);
        connectedNodeIds.add(targetId);
      });

      // Filter nodes to only include those that are still connected or are the centered node
      const filteredNodes = baseGraphData.nodes.filter(node =>
        connectedNodeIds.has(node.id) || node.isCentered
      );

      return { nodes: filteredNodes, edges: filteredEdges };
    }

    return { nodes: baseGraphData.nodes, edges: filteredEdges };
  }, [baseGraphData, contacts, userId, userName, currentView, activeFilters.relationships]);

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

  // No longer return isLoading since we don't manage loading state here
  // Loading is handled by the probes in ContactNetworkTab
};
