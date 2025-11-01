import {UilInfoCircle as Info} from "@iconscout/react-unicons"
import {Box, Divider, IconButton, Typography} from "@mui/material"

export const RCardsListSideWidget = () => {
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
                  sx={{mb: 2, px: 1, fontSize: '14px', display: 'block'}}>
        Each card defines the kinds of information you share within a relationship category. When you share a card you
        automatically set permissions at the same time. You can customize a card you’ve shared with someone in
        particular.
      </Typography>
    </Box>
  )
}
