import {
  Typography,
  Box,
  IconButton, CardContent,
  Card,
} from '@mui/material';
import {forwardRef, useCallback} from 'react';
import {RelationshipCategory} from '@/constants/relationshipCategories';
import {UilEdit as BorderColorOutlined} from '@iconscout/react-unicons';
import {RCardView} from "@/components/rcards/RCard/RCardView.tsx";
import {RCardEdit} from "@/components/rcards/RCard/RCardEdit.tsx";

export interface RCardProps {
  card: RelationshipCategory;
  id: string;
  setEditingCardId: (id: string) => void;
  disabled?: boolean;
  isEditing?: boolean;
}

export const RCard = forwardRef<HTMLDivElement, RCardProps>(
  ({card, id, setEditingCardId, disabled = false, isEditing = false}, ref) => {
    const toggleEdit = useCallback(() => {
      card.rerender = {shouldRerender: true};
      setEditingCardId(isEditing ? "" : id);
    }, [setEditingCardId, id, isEditing, card]);

    return (
      <Box sx={{display: 'flex', flexDirection: 'column', overflowWrap: "anywhere"}} ref={ref} key={id}>
        <Box sx={{
          display: "flex",
          flexDirection: "row",
          pb: 1,
          justifyContent: "space-between",
          width: "100%",
        }}>
          <Typography variant="h6" sx={{fontWeight: 'bold', opacity: disabled ? 0.3 : 1}}>
            {card.name}
          </Typography>
          <IconButton disabled={disabled} size="small" onClick={toggleEdit}>
            <BorderColorOutlined size="16"/>
          </IconButton>
        </Box>

        {/* Flipper container with perspective */}
        <Box
          sx={{
            position: 'relative',
            perspective: '1000px',
            minWidth: {xs: '280px', sm: '320px', md: '360px'},
            width: {xs: "calc(100vw - 40px)", md: "360px", sm: '320px'}
          }}
        >
          {/* Front Card (RCardView) */}
          <Card
            sx={{
              position: isEditing ? 'absolute' : 'relative',
              top: 0,
              left: 0,
              width: '100%',
              minWidth: {xs: '280px', sm: '320px', md: '360px'},
              borderRadius: '12px',
              border: '1px solid #D9D9D9',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden',
              transition: 'transform 0.6s ease-in-out',
              transform: isEditing ? 'rotateY(180deg)' : 'rotateY(0deg)',
              zIndex: isEditing ? 1 : 2,
            }}
          >
            <CardContent sx={{flex: 1, p: 0, pt: '50px', textAlign: 'center'}}>
              <RCardView card={card} disabled={disabled}/>
            </CardContent>
          </Card>

          {/* Back Card (RCardEdit) */}
          <Card
            sx={{
              position: isEditing ? 'relative' : 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              minWidth: {xs: '280px', sm: '320px', md: '360px'},
              borderRadius: '12px',
              border: '1px solid #D9D9D9',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden',
              transition: 'transform 0.6s ease-in-out',
              transform: isEditing ? 'rotateY(0deg)' : 'rotateY(-180deg)',
              zIndex: isEditing ? 2 : 1,
            }}
          >
            <CardContent sx={{flex: 1, p: 0, pt: '50px', textAlign: 'center'}}>
              <RCardEdit card={card}/>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  });

