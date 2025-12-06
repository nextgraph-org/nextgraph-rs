import {useState} from 'react';
import {
  Box,
  Card,
  Typography,
  Avatar,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem, IconButton, Chip, alpha, useTheme, CardContent
} from '@mui/material';
import {
  UilThumbsUp as ThumbUp,
  UilCommentAlt as Comment,
  UilShareAlt as Share,
  UilAngleDown as ExpandMore,
  UilAngleUp as ExpandLess,
  UilEllipsisV as MoreVert
} from '@iconscout/react-unicons';
import type {GroupPost} from '@/types/group';
import PostCreateButton from '@/components/PostCreateButton';
import {formatDate} from "@/utils/dateHelpers";

interface ExtendedPost extends GroupPost {
  topic?: string;
  images?: string[];
  isLong?: boolean;
}

interface ActivityFeedProps {
  posts: ExtendedPost[];
}

export const ActivityFeed = ({posts}: ActivityFeedProps) => {
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('all');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('all');
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const theme = useTheme();

  const togglePostExpansion = (postId: string) => {
    const newExpanded = new Set(expandedPosts);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
    }
    setExpandedPosts(newExpanded);
  };

  const handleCreatePost = (type: 'post' | 'offer' | 'want', groupId?: string) => {
    console.log(`Creating ${type} in group ${groupId || 'unknown'}`);
    // TODO: Implement group post creation logic
  };

  return (
    <Box sx={{display: 'flex', flexDirection: 'column', flex: 1, position: 'relative'}}>
      {/* + Button positioned within Activity Feed */}
      <Box sx={{
        position: {xs: 'fixed', md: 'absolute'},
        bottom: {xs: 62, md: 24 },
        right: {xs: 10, md: 24},
        zIndex: 1000,
        '& .MuiFab-root': {
          position: 'relative !important',
          bottom: 'auto !important',
          right: 'auto !important'
        }
      }}>
        <PostCreateButton
          groupId={"1"}
          onCreatePost={handleCreatePost}
        />
      </Box>
      <Typography variant="h6" sx={{fontWeight: 600, mb: 2, color: 'primary.main', flexShrink: 0}}>
        Activity Feed
      </Typography>

      <Box sx={{display: 'flex', gap: 2, mb: 2}}>
        <FormControl size="small" sx={{minWidth: 120}}>
          <InputLabel>Filter by Person</InputLabel>
          <Select
            value={selectedPersonFilter}
            label="Filter by Person"
            onChange={(e) => setSelectedPersonFilter(e.target.value)}
          >
            <MenuItem value="all">All People</MenuItem>
            <MenuItem value="ruben">Ruben Daniels</MenuItem>
            <MenuItem value="oliver">Oliver S-B</MenuItem>
            <MenuItem value="margeigh">Margeigh Novotny</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{minWidth: 120}}>
          <InputLabel>Filter by Topic</InputLabel>
          <Select
            value={selectedTopicFilter}
            label="Filter by Topic"
            onChange={(e) => setSelectedTopicFilter(e.target.value)}
          >
            <MenuItem value="all">All Topics</MenuItem>
            <MenuItem value="garden">Garden Planning</MenuItem>
            <MenuItem value="tools">Tool Sharing</MenuItem>
            <MenuItem value="composting">Composting</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{
        flex: 1,
        display: 'flex',
        overflow: 'auto',
        flexDirection: 'column',
        gap: 2,
        '&::-webkit-scrollbar': {
          width: '8px'
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'transparent'
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.2),
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.3)
          }
        }
      }}>
        {posts.map((post) => {
          const isExpanded = expandedPosts.has(post.id);
          const isLongPost = post.isLong;
          const shouldTruncate = isLongPost && !isExpanded;
          const truncatedContent = shouldTruncate
            ? post.content.substring(0, 200) + '...'
            : post.content;
          return <Card key={post.id} sx={{border: 1, borderColor: 'divider'}}>
            <CardContent sx={{p: 3}}>
              {/* Post Header */}
              <Box sx={{display: 'flex', alignItems: 'center', gap: 2, mb: 2}}>
                <Avatar src={post.authorAvatar} alt={post.authorName} sx={{width: 48, height: 48}}>
                  {post.authorName.charAt(0)}
                </Avatar>
                <Box sx={{flexGrow: 1}}>
                  <Typography variant="subtitle1" sx={{fontWeight: 600}}>
                    {post.authorName}
                  </Typography>
                  <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(post.createdAt, {month: "short"})}
                    </Typography>
                    {post.topic && (
                      <>
                        <Typography variant="caption" color="text.secondary">•</Typography>
                        <Chip
                          label={post.topic}
                          size="small"
                          variant="outlined"
                          sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                            borderColor: alpha(theme.palette.primary.main, 0.2),
                            color: 'primary.main'
                          }}
                        />
                      </>
                    )}
                  </Box>
                </Box>
                <IconButton size="small">
                  <MoreVert/>
                </IconButton>
              </Box>

              {/* Post Content */}
              <Typography variant="body1" sx={{mb: 2, lineHeight: 1.6}}>
                {truncatedContent}
              </Typography>

              {/* Expand/Collapse button for long posts */}
              {isLongPost && (
                <Button
                  variant="text"
                  size="small"
                  onClick={() => togglePostExpansion(post.id)}
                  startIcon={isExpanded ? <ExpandLess/> : <ExpandMore/>}
                  sx={{mb: 2, color: 'primary.main'}}
                >
                  {isExpanded ? 'Show less' : 'Read more'}
                </Button>
              )}

              {/* Post Images */}
              {post.images && post.images.length > 0 && (
                <Box sx={{mb: 2}}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: (post.images?.length ?? 0) === 1 ? '1fr' :
                        (post.images?.length ?? 0) === 2 ? '1fr 1fr' :
                          'repeat(3, 1fr)',
                      gap: 1,
                      borderRadius: 2,
                      overflow: 'hidden'
                    }}
                  >
                    {post.images.map((image: string, index: number) => (
                      <Box
                        key={index}
                        component="img"
                        src={image}
                        alt={`Post image ${index + 1}`}
                        sx={{
                          width: '100%',
                          height: (post.images?.length ?? 0) === 1 ? 300 : 200,
                          objectFit: 'cover',
                          borderRadius: (post.images?.length ?? 0) === 1 ? 2 : 1,
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease-in-out',
                          '&:hover': {
                            transform: 'scale(1.02)'
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Post Actions */}
              <Box sx={{display: 'flex', alignItems: 'center', gap: 2, pt: 1, borderTop: 1, borderColor: 'divider'}}>
                <Button
                  startIcon={<ThumbUp/>}
                  size="small"
                  variant="text"
                  sx={{color: 'text.secondary'}}
                >
                  {post.likes}
                </Button>
                <Button
                  startIcon={<Comment/>}
                  size="small"
                  variant="text"
                  sx={{color: 'text.secondary'}}
                >
                  {post.comments}
                </Button>
                <Button
                  startIcon={<Share/>}
                  size="small"
                  variant="text"
                  sx={{color: 'text.secondary'}}
                >
                  Share
                </Button>
              </Box>
            </CardContent>
          </Card>
        })}
      </Box>
    </Box>
  );
};