import { api } from "src/boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import {
  ApiV1CommentCreatePostRequest,
  ApiV1CommentFetchPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { useCommonApi } from "./common";
import { useDialog } from "../ui/dialog";

export function useBackendCommentApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showMessage } = useDialog();

  async function fetchCommentsForPost(postSlugId: string) {
    try {
      const params: ApiV1CommentFetchPostRequest = {
        postSlugId: postSlugId,
      };

      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1CommentFetchPost(params, {});

      return response.data;
    } catch (e) {
      console.error(e);
      showMessage("An error had occured", "Failed to fetch comments for post.");
      return null;
    }
  }

  async function createNewComment(commentBody: string, postSlugId: string) {
    try {
      const params: ApiV1CommentCreatePostRequest = {
        commentBody: commentBody,
        postSlugId: postSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1CommentCreatePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1CommentCreatePost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      return response.data;
    } catch (e) {
      console.error(e);
      showMessage("An error had occured", "Failed to add comment to post.");
      return null;
    }
  }

  return { createNewComment, fetchCommentsForPost };
}
