import { redirect } from "next/navigation";
import { env } from "cloudflare:workers";
import { chatGPTSignInPath, getChatGPTUser } from "../chatgpt-auth";
import StudioEditor from "./studio-editor";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const user = await getChatGPTUser();
  if (!user) redirect(chatGPTSignInPath("/studio"));
  if (user.email.toLowerCase() !== env.ADMIN_EMAIL?.toLowerCase()) {
    return <main className="studio-denied"><h1>Khu vực quản trị CHAMÉA</h1><p>Tài khoản hiện tại chưa được cấp quyền biên tập website.</p><a href="/">Về website</a></main>;
  }
  return <StudioEditor />;
}
