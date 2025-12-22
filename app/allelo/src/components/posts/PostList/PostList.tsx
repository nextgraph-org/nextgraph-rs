import {SocialPost} from "@/.orm/shapes/group.typings.ts";
import {alpha, Box} from "@mui/material";
import {Post} from "@/components/posts/Post";

interface SocialPostListProps {
  posts: SocialPost[];
}

export const PostList = ({posts}: SocialPostListProps) => {
  return <Box sx={{
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
    {posts.map((post) => <Post key={post["@id"]} post={post}/>)}
  </Box>
}