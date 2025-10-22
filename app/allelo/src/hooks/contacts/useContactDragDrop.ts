import { useState } from 'react';
import { useRelationshipCategories } from './../useRelationshipCategories';

interface UseContactDragDropProps {
  selectedContactNuris: string[];
}

export interface UseContactDragDropReturn {
  draggedContactNuri: string | null;
  dragOverCategory: string | null;
  handleDragStart: (e: React.DragEvent, contactNuri: string) => void;
  handleDragEnd: () => void;
  handleDragOver: (e: React.DragEvent, category: string) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent, category: string) => void;
  getDraggedContactsCount: () => number;
  getCategoryDisplayName: (category: string) => string;
}

export const useContactDragDrop = ({
  selectedContactNuris
}: UseContactDragDropProps): UseContactDragDropReturn => {
  const [draggedContactNuri, setDraggedContactNuri] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const { getCategoryDisplayName: getDisplayName } = useRelationshipCategories();

  const handleDragStart = (e: React.DragEvent, contactNuri: string) => {
    const isSelected = selectedContactNuris.includes(contactNuri);
    const contactNurisToMove = isSelected && selectedContactNuris.length > 1 
      ? selectedContactNuris 
      : [contactNuri];

    e.dataTransfer.setData('application/json', JSON.stringify({
      contactNuris: contactNurisToMove
    }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedContactNuri(contactNuri);
  };

  const handleDragEnd = () => {
    setDraggedContactNuri(null);
    setDragOverCategory(null);
  };

  const handleDragOver = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCategory(category);
  };

  const handleDragLeave = () => {
    setDragOverCategory(null);
  };

  const handleDrop = async (e: React.DragEvent, category: string) => {
    e.preventDefault();
    setDragOverCategory(null);

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      const contactNurisToUpdate = dragData.contactNuris || [];

      const newCategory = category === 'all' ? undefined : category;
      
      // Dispatch category update events for each contact
      contactNurisToUpdate.forEach((nuri: string) => {
        window.dispatchEvent(new CustomEvent('contactCategorized', {
          detail: { contactId: nuri, category: newCategory }
        }));
      });
    } catch (error) {
      console.error('Failed to update contact category:', error);
    }
  };

  const getDraggedContactsCount = () => {
    if (!draggedContactNuri) return 0;
    const isSelected = selectedContactNuris.includes(draggedContactNuri);
    return isSelected && selectedContactNuris.length > 1 
      ? selectedContactNuris.length 
      : 1;
  };

  const getCategoryDisplayName = (category: string) => {
    return getDisplayName(category);
  };

  return {
    draggedContactNuri,
    dragOverCategory,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    getDraggedContactsCount,
    getCategoryDisplayName
  };
};