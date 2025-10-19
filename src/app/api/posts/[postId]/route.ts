import { deletePost, getPost, updatePost } from "@/server/api/posts";

export const GET = getPost;
export const PATCH = updatePost;
export const DELETE = deletePost;
