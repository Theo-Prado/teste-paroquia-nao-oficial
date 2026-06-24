import { createFileRoute } from "@tanstack/react-router";
import { PostEditor } from "./_authenticated.admin.postagens.novo";

export const Route = createFileRoute("/_authenticated/admin/postagens/$id")({
  component: function Edit() {
    const { id } = Route.useParams();
    return <PostEditor mode="edit" id={id} />;
  },
});
