import {Box, Divider, Typography} from '@mui/material';
import type {ContactsFilters} from '@/hooks/contacts/useContacts';
import {useRef} from "react";
import {useGetRCards} from "@/hooks/rCards/useGetRCards.ts";
import {RCardsCategoryTile} from "@/components/rcards/RCardsCategoryTile/RCardsCategoryTile.tsx";

interface RCardsMobileWidgetProps {
  filters: ContactsFilters;
  onAddFilter: (key: keyof ContactsFilters, value: ContactsFilters[keyof ContactsFilters]) => void;
}

export const RCardsMobileWidget = ({
                                  filters,
                                  onAddFilter,
                                }: RCardsMobileWidgetProps) => {
  const {rCards} = useGetRCards();

  const scrollerRef = useRef<HTMLDivElement>(null);

  return (
    <Box sx={{
      width: '100%',
      flexShrink: 0,
      px: 2
    }}>
      <Typography variant={"body1"} fontWeight={800}>Relationships</Typography>
      <Typography variant={"body2"} fontSize={"11px"} color={"secondary"}>Drag and drop contacts into a rCard to
        automatically set sharing permissions.</Typography>
      <Box
        ref={scrollerRef}
        sx={{
          maxWidth: '255px',
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          gap: 1,
          pb: 1
        }}>
        {rCards.map((rCard) => (
          <RCardsCategoryTile
            rCard={rCard}
            isMobile={true}
            isActive={filters.relationshipFilter === rCard["@id"]}
            onActivate={() => onAddFilter('relationshipFilter', filters.relationshipFilter === rCard["@id"] ? "all" : rCard["@id"])}
          />
        ))}
      </Box>
      <Divider  />
    </Box>
  );
};
