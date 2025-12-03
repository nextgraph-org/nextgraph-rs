import {Box, Card, CardContent, Grid, Typography, useTheme} from "@mui/material";
import {UilUsersAlt as People} from "@iconscout/react-unicons";
import {useGroupData} from "@/hooks/groups/useGroupData.ts";
import {GroupAvatarUpload} from "@/components/groups/GroupAvatarUpload";

export const GroupItemDesktop = ({nuri, onGroupClick}: { nuri: string, onGroupClick: (id: string) => void }) => {
  const {group} = useGroupData(nuri);
  const theme = useTheme();

  if (!group) return null;

  return <Grid size={{xs: 12, md: 6, lg: 4}} key={group["@id"]}>
    <Card
      onClick={() => onGroupClick(nuri)}
      sx={{
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        border: 1,
        borderColor: 'divider',
        height: '100%',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: theme.shadows[4],
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{p: 3}}>
        <Box sx={{display: 'flex', alignItems: 'center', gap: 2, mb: 2}}>
          <GroupAvatarUpload size={{xs: 48, sm: 48}} initial={group.title} groupNuri={group["@graph"]} isEditing={false}/>

          <Box sx={{flexGrow: 1}}>
            <Box
              sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1, justifyContent: 'space-between'}}>
              <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minWidth: 0}}>
                <Typography variant="h6" component="div" sx={{fontWeight: 700}}>
                  {group.title}
                </Typography>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 0.25}}>
                  <People sx={{fontSize: 16, color: 'text.secondary'}}/>
                  <Typography variant="body2" color="text.secondary" sx={{fontWeight: 600}}>
                    {group.hasMember?.size}
                  </Typography>
                </Box>
              </Box>

            </Box>
          </Box>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {group.description}
        </Typography>

        {/*<Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2}}>*/}
        {/*  {group.tags?.slice(0, 3).map((tag) => (*/}
        {/*    <Chip*/}
        {/*      key={tag}*/}
        {/*      label={tag}*/}
        {/*      size="small"*/}
        {/*      variant="outlined"*/}
        {/*      sx={{*/}
        {/*        borderRadius: 1,*/}
        {/*        backgroundColor: alpha(theme.palette.primary.main, 0.04),*/}
        {/*        borderColor: alpha(theme.palette.primary.main, 0.12),*/}
        {/*        color: 'primary.main',*/}
        {/*        fontWeight: 500,*/}
        {/*      }}*/}
        {/*    />*/}
        {/*  ))}*/}
        {/*</Box>*/}

        {/*{group.latestPost && (*/}
        {/*  <Box>*/}
        {/*    <Typography variant="caption" color="text.secondary"*/}
        {/*                sx={{fontWeight: 500, display: 'block', mb: 0.5}}>*/}
        {/*      Latest post:*/}
        {/*    </Typography>*/}
        {/*    <Typography*/}
        {/*      variant="body2"*/}
        {/*      color="text.secondary"*/}
        {/*      sx={{*/}
        {/*        fontStyle: 'italic',*/}
        {/*        overflow: 'hidden',*/}
        {/*        textOverflow: 'ellipsis',*/}
        {/*        whiteSpace: 'nowrap',*/}
        {/*        fontSize: '0.8rem',*/}
        {/*        fontWeight: 600*/}
        {/*      }}*/}
        {/*    >*/}
        {/*      {group.latestPostAuthor && `${group.latestPostAuthor.split(' ')[0]}: `}{group.latestPost}*/}
        {/*    </Typography>*/}
        {/*  </Box>*/}
        {/*)}*/}
      </CardContent>
    </Card>
  </Grid>
}