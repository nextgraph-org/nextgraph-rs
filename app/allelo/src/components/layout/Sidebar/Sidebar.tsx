import { forwardRef } from 'react';
import { Box, Typography, Divider, IconButton } from '@mui/material';
import { Info, Add } from '@mui/icons-material';
import { NavigationMenu } from '../NavigationMenu';
import { useContactDragDrop } from '@/hooks/contacts/useContactDragDrop';
import type { SidebarProps } from './types';
import {useRelationshipCategories} from "@/hooks/useRelationshipCategories";

export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(
  ({
    navItems,
    expandedItems,
    isActiveRoute,
    onToggleExpanded,
    onNavigation,
    currentPath,
    relationshipCategories
  }, ref) => {
    const showCategories = currentPath === '/contacts';
    const {getCategoryIcon} = useRelationshipCategories();
    
    const dragDrop = useContactDragDrop({
      selectedContactNuris: []
    });

    const handleInfoClick = () => {
      console.log('Relationship categories info clicked');
      // TODO: Show info dialog or tooltip about relationship categories
    };

    return (
      <Box 
        ref={ref} 
        sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <Box sx={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          px: 3, 
          border: 'none',
          flexShrink: 0,
        }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
            NAO
          </Typography>
        </Box>
        
        <NavigationMenu
          navItems={navItems}
          expandedItems={expandedItems}
          isActiveRoute={isActiveRoute}
          onToggleExpanded={onToggleExpanded}
          onNavigation={onNavigation}
        />

        {showCategories && (
          <Box sx={{ px: 2, pb: 2, overflow: 'auto' }}>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 1, 
              px: 1 
            }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Relationships
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton
                  size="small" 
                  onClick={handleInfoClick}
                  sx={{ 
                    color: 'text.secondary',
                    p: 0.5,
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  <Info fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Typography variant="caption" sx={{ mb: 2, color: 'text.secondary', px: 1, fontSize: '0.7rem', lineHeight: 1.2, display: 'block' }}>
              Drag and drop contacts into a category to automatically set sharing permissions.
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
              {relationshipCategories.map((category) => (
                <Box
                  key={category.id}
                  onDragOver={(e) => dragDrop.handleDragOver(e, category.id)}
                  onDragLeave={dragDrop.handleDragLeave}
                  onDrop={(e) => dragDrop.handleDrop(e, category.id)}
                  sx={{
                    minHeight: 80,
                    border: 2,
                    borderColor: dragDrop.dragOverCategory === category.id ? category.color : 'divider',
                    borderStyle: dragDrop.dragOverCategory === category.id ? 'solid' : 'dashed',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 1,
                    cursor: 'pointer',
                    backgroundColor: dragDrop.dragOverCategory === category.id ? `${category.color}10` : 'transparent',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: category.color,
                      backgroundColor: `${category.color}08`,
                    },
                  }}
                >
                  <Box sx={{ color: category.color, mb: 0.5 }}>
                    {getCategoryIcon(category.id)}
                  </Box>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      textAlign: 'center', 
                      fontSize: '0.7rem', 
                      fontWeight: 500,
                      lineHeight: 1.2
                    }}
                  >
                    {category.name}
                  </Typography>
                  {(category.count ?? 0) > 0 && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'text.secondary', 
                        fontSize: '0.6rem',
                        mt: 0.5
                      }}
                    >
                      {category.count}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
            
            {/* Add Relationship Icon Button */}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <IconButton 
                size="small" 
                onClick={() => console.log('Add relationship clicked')}
                sx={{ 
                  color: 'text.secondary',
                  border: 1,
                  borderColor: 'divider',
                  borderStyle: 'hidden',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                    borderColor: 'primary.main',
                    borderStyle: 'solid'
                  }
                }}
              >
                <Add fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        )}
      </Box>
    );
  }
);

Sidebar.displayName = 'Sidebar';