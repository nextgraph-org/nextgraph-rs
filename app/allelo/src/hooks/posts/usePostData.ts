import {SocialPost} from "@/.orm/shapes/group.typings.ts";
import {useResolvedContact} from "@/hooks/contacts/useResolvedContact.ts";

interface postData {
  authorName: string;
  avatarUrl: string | undefined;
  postContent: string;
}

export function usePostData(post?: SocialPost): postData {
  const authorNuri: string = post?.author ?? "";
  const {name, photoUrl} = useResolvedContact(authorNuri);

  return {
    authorName: name,
    avatarUrl: photoUrl,
    postContent: post?.description ?? "",
  }

}