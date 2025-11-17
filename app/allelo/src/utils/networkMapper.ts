import { Contact } from '@/types/contact';
import { GraphNode, GraphEdge, NodePriority } from '@/types/network';
import { resolveFrom } from '@/utils/socialContact/contactUtils';
import { defaultTemplates, renderTemplate } from '@/utils/templateRenderer';

const calculatePriority = (contact: Contact): NodePriority => {
  const hasRecentInteraction = contact.lastInteractionAt &&
    Date.now() - contact.lastInteractionAt.getTime() < 30 * 24 * 60 * 60 * 1000;
  const hasHighInteractionCount = (contact.interactionCount || 0) > 10;
  const hasVouches = (contact.vouchesSent || 0) + (contact.vouchesReceived || 0) > 0;
  const photo = resolveFrom(contact, 'photo');
  const hasPhoto = !!photo?.value;

  if ((hasRecentInteraction || hasHighInteractionCount || hasVouches) && hasPhoto) {
    return 'high';
  }

  return 'medium';
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

export const mapContactsToNodes = (
  contacts: Contact[],
  centeredContactId?: string
): GraphNode[] => {
  return contacts.map((contact) => {
    // Handle name - can be a Set-like object or an array
    let name = resolveFrom(contact, 'name');

    // If resolveFrom returns undefined but contact.name exists, try to extract it
    if (!name && contact.name) {
      // Try to convert to array if it has toArray method (Set-like object)
      const nameArray = typeof contact.name === 'object' && 'toArray' in contact.name
        ? (contact.name as any).toArray()
        : Array.isArray(contact.name)
        ? contact.name
        : [contact.name];

      if (nameArray.length > 0) {
        // Find preferred/selected name, or use first one
        name = nameArray.find((n: any) => n.selected || n.preferred) || nameArray[0];
      }
    }

    const photo = resolveFrom(contact, 'photo');
    const nameValue = name?.value || renderTemplate(defaultTemplates.contactName, name) || 'Unknown';

    return {
      id: contact['@id'] || nameValue,
      type: 'person' as const,
      name: nameValue,
      avatar: photo?.value,
      initials: getInitials(nameValue),
      isCentered: contact['@id'] === centeredContactId,
      priority: calculatePriority(contact),
    };
  });
};

const addEdge = (
  edges: GraphEdge[],
  sourceId: string,
  targetId: string,
  type: 'confirmed' | 'invitation' | 'weak',
  strength: number,
  relationship?: string
) => {
  const edgeId = [sourceId, targetId].sort().join('-');
  const existingEdge = edges.find((e) => e.id === edgeId);

  if (!existingEdge) {
    edges.push({
      id: edgeId,
      source: sourceId,
      target: targetId,
      type,
      strength: Math.min(strength, 1),
      relationship,
    });
  } else {
    existingEdge.strength = Math.min((existingEdge.strength || 0) + strength * 0.3, 1);
    if (type === 'confirmed' && existingEdge.type === 'weak') {
      existingEdge.type = 'confirmed';
    }
    if (relationship && !existingEdge.relationship) {
      existingEdge.relationship = relationship;
    }
  }
};

export const mapContactsToEdges = (contacts: Contact[]): GraphEdge[] => {
  const edges: GraphEdge[] = [];

  contacts.forEach((contact) => {
    const contactId = contact['@id'] || '';

    if (contact.internalGroup) {
      contact.internalGroup.forEach((groupId) => {
        const otherContacts = contacts.filter(
          (c) => c.internalGroup?.some((g) => g.value === groupId.value) && c['@id'] !== contactId
        );

        otherContacts.forEach((otherContact) => {
          const hasRecentInteraction =
            contact.lastInteractionAt &&
            Date.now() - contact.lastInteractionAt.getTime() < 90 * 24 * 60 * 60 * 1000;

          addEdge(
            edges,
            contactId,
            otherContact['@id'] || '',
            hasRecentInteraction ? 'confirmed' : 'weak',
            hasRecentInteraction ? 0.8 : 0.3,
            contact.relationshipCategory
          );
        });
      });
    }

    if (contact.relation) {
      contact.relation.forEach((rel) => {
        const relatedContact = contacts.find((c) => {
          const name = resolveFrom(c, 'name');
          return name?.value === rel.value;
        });

        if (relatedContact && relatedContact['@id']) {
          const relType = rel.type2?.['@id'];
          const isStrongRelation = ['spouse', 'child', 'parent', 'sibling', 'partner'].includes(
            relType || ''
          );
          addEdge(
            edges,
            contactId,
            relatedContact['@id'],
            'confirmed',
            isStrongRelation ? 1 : 0.7,
            relType
          );
        }
      });
    }

    if (contact.organization) {
      contact.organization.forEach((org) => {
        const orgValue = org.value || '';
        if (!orgValue) return;

        const colleagues = contacts.filter((c) => {
          if (c['@id'] === contactId) return false;
          return c.organization?.some((o) => o.value === orgValue);
        });

        colleagues.forEach((colleague) => {
          const isCurrent = org.current === true;
          const colleagueOrg = colleague.organization
            ? Array.from(colleague.organization).find((o) => o.value === orgValue)
            : undefined;
          const bothCurrent = isCurrent && colleagueOrg?.current === true;

          addEdge(
            edges,
            contactId,
            colleague['@id'] || '',
            bothCurrent ? 'confirmed' : 'weak',
            bothCurrent ? 0.7 : 0.4,
            'colleague'
          );
        });
      });
    }

    if (contact.education) {
      contact.education.forEach((edu) => {
        const schoolName = edu.value || '';
        if (!schoolName) return;

        const alumni = contacts.filter((c) => {
          if (c['@id'] === contactId) return false;
          return c.education?.some((e) => e.value === schoolName);
        });

        alumni.forEach((alum) => {
          addEdge(edges, contactId, alum['@id'] || '', 'weak', 0.3, 'alumni');
        });
      });
    }

    if (contact.project) {
      contact.project.forEach((proj) => {
        const projectName = proj.value || '';
        if (!projectName) return;

        const collaborators = contacts.filter((c) => {
          if (c['@id'] === contactId) return false;
          return c.project?.some((p) => p.value === projectName);
        });

        collaborators.forEach((collab) => {
          addEdge(edges, contactId, collab['@id'] || '', 'confirmed', 0.6, 'collaborator');
        });
      });
    }

    if (contact.tag) {
      const contactTagsArray = Array.from(contact.tag);
      if (contactTagsArray.length > 0) {
        const contactTags = new Set(contactTagsArray.map((t) => t.valueIRI['@id']));

        contacts.forEach((otherContact) => {
          if (otherContact['@id'] === contactId || !otherContact.tag) return;

          const otherTagsArray = Array.from(otherContact.tag);
          const sharedTags = otherTagsArray.filter((t) => contactTags.has(t.valueIRI['@id']));

          if (sharedTags.length >= 3) {
            addEdge(
              edges,
              contactId,
              otherContact['@id'] || '',
              'weak',
              Math.min(sharedTags.length * 0.15, 0.5),
              'shared interests'
            );
          }
        });
      }
    }
  });

  return edges;
};

export const addUserNode = (userId: string, userName: string): GraphNode => ({
  id: userId,
  type: 'user',
  name: userName,
  initials: getInitials(userName),
  isCentered: false,
  priority: 'high',
});
