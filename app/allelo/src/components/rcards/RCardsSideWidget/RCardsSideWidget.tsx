import {UilInfoCircle as Info} from "@iconscout/react-unicons";
import {Box, Divider, IconButton, Typography} from "@mui/material";
import {RCardsCategoryTile} from "@/components/rcards/RCardsCategoryTile/RCardsCategoryTile.tsx";
import {useGetRCards} from "@/hooks/rCards/useGetRCards.ts";

export const RCardsSideWidget = () => {
  const {rCards} = useGetRCards();

  const handleInfoClick = () => {
    console.log('Relationship categories info clicked');
    // TODO: Show info dialog or tooltip about relationship categories
  };

  return (
    <Box sx={{px: 2, pb: 2, overflow: 'auto'}}>
      <Divider sx={{mb: 2}}/>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 1,
        px: 1
      }}>
        <Typography variant="subtitle2" sx={{fontWeight: 600, color: 'text.secondary'}}>
          Relationships
        </Typography>
        <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
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
            <Info size="16"/>
          </IconButton>
        </Box>
      </Box>
      <Typography variant="caption"
                  sx={{mb: 2, color: 'text.secondary', px: 1, fontSize: '0.7rem', lineHeight: 1.2, display: 'block'}}>
        Drag and drop contacts into a category to automatically set sharing permissions.
      </Typography>
      <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1}}>
        {[...rCards ?? []].map((rCard) => (
          <RCardsCategoryTile
            key={rCard["@id"]}
            rCard={rCard}
          />
        ))}
      </Box>
    </Box>
  );
};
