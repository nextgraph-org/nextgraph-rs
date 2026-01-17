import {SocialPost} from "@/.orm/shapes/group.typings.ts";
import {formatDate} from "@/utils/dateHelpers";
import {alpha, Avatar, Box, Card, CardContent, Typography, useTheme} from "@mui/material";
import {useCallback, useMemo, useState} from "react";
import {
  UilAngleDown,
  UilAngleUp,
} from "@iconscout/react-unicons";
import {Button} from "@/components/ui";
import {Tags} from "@/components/ui/Tags";
import {usePostData} from "@/hooks/posts/usePostData.ts";
import {contactDictMapper} from "@/utils/dictMappers.ts";

interface SocialPostProps {
  post: SocialPost;
}

export const Post = ({post}: SocialPostProps) => {
  const theme = useTheme();
  
  const {authorName, avatarUrl, postContent} = usePostData(post);

  const images: string[] = useMemo(() => /*post.images ?? */[], []);

  const [isExpanded, setIsExpanded] = useState(false);

  const togglePostExpansion = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const isLongPost = postContent.length > 250;
  const shouldTruncate = isLongPost && !isExpanded;
  const truncatedContent = shouldTruncate
    ? postContent.substring(0, 200) + '...'
    : postContent;

  return <Card key={post["@id"]} sx={{border: 1, borderColor: 'divider'}}>
    <CardContent sx={{p: {xs: 1, md: 3}}}>
      {/* Post Header */}
      <Box sx={{display: 'flex', alignItems: 'center', gap: 2, mb: 2}}>
        <Avatar src={avatarUrl} alt={authorName} sx={{width: 48, height: 48}}>
          {authorName.charAt(0)}
        </Avatar>
        <Box sx={{flexGrow: 1}}>
          <Typography variant="subtitle1" sx={{fontWeight: 600}}>
            {authorName}
          </Typography>
          <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
            <Typography variant="caption" color="text.secondary">
              {formatDate(post.createdAt, {month: "short"})}
            </Typography>
            {(post.tag?.size ?? 0) > 0 && (
              <>
                <Typography variant="caption" color="text.secondary">•</Typography>
                <Tags existingTags={[...post.tag ?? []].map(contactDictMapper.removePrefix)} disabled={true} sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  borderColor: alpha(theme.palette.primary.main, 0.2),
                  color: 'primary.main'
                }} variant="outlined"/>
              </>
            )}
          </Box>
        </Box>
        {/*<IconButton size="small">*/}
        {/*  <UilEllipsisV/>*/}
        {/*</IconButton>*/}
      </Box>

      {/* Post Content */}
      <Typography variant="body1" sx={{mb: 0, lineHeight: 1.6, overflowWrap: "break-word"}}>
        {truncatedContent}
      </Typography>

      {/* Expand/Collapse button for long posts */}
      {isLongPost && (
        <Button
          variant="text"
          size="small"
          onClick={togglePostExpansion}
          startIcon={isExpanded ? <UilAngleUp/> : <UilAngleDown/>}
          sx={{mb: 2, color: 'primary.main'}}
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </Button>
      )}

      {/* Post Images */}
      {images && images.length > 0 && (
        <Box sx={{mb: 2}}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: (images?.length ?? 0) === 1 ? '1fr' :
                (images?.length ?? 0) === 2 ? '1fr 1fr' :
                  'repeat(3, 1fr)',
              gap: 1,
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            {images.map((image: string, index: number) => (
              <Box
                key={index}
                component="img"
                src={image}
                alt={`Post image ${index + 1}`}
                sx={{
                  width: '100%',
                  height: (images?.length ?? 0) === 1 ? 300 : 200,
                  objectFit: 'cover',
                  borderRadius: (images?.length ?? 0) === 1 ? 2 : 1,
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
      {/*<Box sx={{display: 'flex', alignItems: 'center', gap: 2, pt: 1, borderTop: 1, borderColor: 'divider'}}>*/}
      {/*  <Button*/}
      {/*    startIcon={<UilThumbsUp/>}*/}
      {/*    size="small"*/}
      {/*    variant="text"*/}
      {/*    sx={{color: 'text.secondary'}}*/}
      {/*  >*/}
      {/*    {post.likes}*/}
      {/*  </Button>*/}
      {/*  <Button*/}
      {/*    startIcon={<UilCommentAlt/>}*/}
      {/*    size="small"*/}
      {/*    variant="text"*/}
      {/*    sx={{color: 'text.secondary'}}*/}
      {/*  >*/}
      {/*    {post.comments}*/}
      {/*  </Button>*/}
      {/*  <Button*/}
      {/*    startIcon={<UilShareAlt/>}*/}
      {/*    size="small"*/}
      {/*    variant="text"*/}
      {/*    sx={{color: 'text.secondary'}}*/}
      {/*  >*/}
      {/*    Share*/}
      {/*  </Button>*/}
      {/*</Box>*/}
    </CardContent>
  </Card>
}