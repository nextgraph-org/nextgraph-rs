import {useCallback, useMemo, useState} from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import PostCreateButton from '@/components/PostCreateButton';
import {PostList} from "@/components/posts/PostList";
import {SocialGroup, SocialPost} from "@/.orm/shapes/group.typings.ts";
import {PostCreateFormData} from "@/components/posts/PostCreateForm";
import {useContactOrm} from "@/hooks/contacts/useContactOrm.ts";
import {useResolvedContact} from "@/hooks/contacts/useResolvedContact.ts";
import {contactDictMapper} from "@/utils/dictMappers.ts";
import {kebabCaseToWords} from "@/utils/stringHelpers.ts";

interface ActivityFeedProps {
  posts: SocialPost[];
  group?: SocialGroup;
}

function PersonOption({id}: { id: string }) {
  const {name} = useResolvedContact(id);
  return name;
}

export const ActivityFeed = ({posts, group}: ActivityFeedProps) => {
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('all');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('all');

  const isEmptyFilter = selectedPersonFilter === 'all' && selectedTopicFilter === 'all';

  const {ormContact: profile} = useContactOrm(null, true);

  const groupMembers = useMemo(() => [...group?.hasMember ?? []].map(gm => gm.contactId), [group]);

  const allTags = useMemo(() => {
    return [...new Set(
      posts.reduce((tags, post) => {
        tags.push(...(post.tag ?? []));
        return tags;
      }, [] as string[])
    )].map(kebabCaseToWords);
  }, [posts])

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      return (selectedTopicFilter === "all" || post.tag?.has(selectedTopicFilter))
        && (selectedPersonFilter === "all" || post.author === selectedPersonFilter);
    });
  }, [selectedPersonFilter, selectedTopicFilter, posts]);

  const createPost = useCallback((data?: PostCreateFormData) => {
    const authorId = profile["@id"];
    const socialPost: SocialPost = {
      "@graph": "",
      "@id": "",
      "@type": new Set(["did:ng:x:social:post#Post"]),
      author: authorId,
      createdAt: new Date(Date.now()).toISOString(),
      description: data?.body ?? "",
      tag: new Set(data?.tags.map((tag) => contactDictMapper.getPrefix("tag", "valueIRI") + tag)),
    }
    if (group) {
      group.post?.add(socialPost)
    }
  }, [group, profile]);

  const handleCreatePost = (type: 'post' | 'offer' | 'want', data?: PostCreateFormData) => {
    switch (type) {
      case 'post':
        return createPost(data);
      default:
        return; //TODO
    }
  };

  return (
    <Box sx={{display: 'flex', flexDirection: 'column', flex: 1, position: 'relative'}}>
      {/* + Button positioned within Activity Feed */}
      <Box sx={{
        position: {xs: 'fixed', md: 'absolute'},
        bottom: {xs: 62},
        top: {md: 10},
        right: {xs: 10, md: 24},
        zIndex: 1000,
        '& .MuiFab-root': {
          position: 'relative !important',
          bottom: 'auto !important',
          right: 'auto !important'
        }
      }}>
        <PostCreateButton
          allTags={allTags}
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
            {groupMembers.map(id => <MenuItem value={id} key={id}>
              <PersonOption key={id} id={id}/>
            </MenuItem>)}
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
            {allTags.map(id => <MenuItem value={id} key={id}>
              {contactDictMapper.removePrefix(id)}
            </MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {filteredPosts.length === 0 ? <Box sx={{textAlign: 'center', py: 8}}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {!isEmptyFilter ? 'No posts found' : 'No posts yet'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {!isEmptyFilter ? 'Try adjusting your search terms.' : 'Try creating a new post!'}
        </Typography>
      </Box> : <PostList posts={filteredPosts}/>}


    </Box>
  );
};