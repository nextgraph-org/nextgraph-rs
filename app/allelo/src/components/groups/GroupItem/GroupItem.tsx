import {alpha, Avatar, Badge, Box, Typography, useTheme} from "@mui/material";
import {UilUsersAlt as People, UilUsersAlt as Group} from "@iconscout/react-unicons";
import {useGroupData} from "@/hooks/groups/useGroupData.ts";

export const GroupItem = ({nuri, onGroupClick}: { nuri: string, onGroupClick: (id: string) => void }) => {
  const {group} = useGroupData(nuri);
  const theme = useTheme();

  if (!group) return null;

  return <Box
    key={group["@id"]}
    onClick={() => onGroupClick(nuri)}
    sx={{
      cursor: 'pointer',
      p: 2,
      border: 1,
      borderColor: 'divider',
      borderRadius: 2,
      '&:hover': {
        borderColor: 'primary.main',
        bgcolor: alpha(theme.palette.primary.main, 0.02),
      },
    }}
  >
    <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
      {/*      <Avatar
        src={group.image}
        alt={group.name}
        sx={{
          width: 40,
          height: 40,
          bgcolor: 'white',
          border: 1,
          borderColor: 'primary.main',
          color: 'primary.main'
        }}
      >
        <Group/>
      </Avatar>*/}

      <Box sx={{flexGrow: 1, minWidth: 0}}>
        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5}}>
          <Typography
            variant="subtitle1"
            component="div"
            sx={{
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {group.title}
          </Typography>
          <Box sx={{display: 'flex', alignItems: 'center', gap: 0.25}}>
            <People sx={{fontSize: 14, color: 'text.secondary'}}/>
            <Typography variant="body2" color="text.secondary" sx={{fontWeight: 600}}>
              {group.hasMember?.size}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>

    {/*{group.latestPost && (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: '0.75rem',
          fontStyle: 'italic',
          fontWeight: 600,
          mt: 1
        }}
      >
        {group.latestPostAuthor && `${group.latestPostAuthor.split(' ')[0]}: `}{group.latestPost}
      </Typography>
    )}*/}
  </Box>
}