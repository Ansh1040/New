import { getStudyState, userIdFromRequest } from "@/lib/study-state";
import { publishGithub } from "@/lib/github-publishing";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const userId=userIdFromRequest(request);
    if(request.headers.get("origin")!==new URL(request.url).origin)throw new Error("Publish from your signed-in tracker.");
    return Response.json(await publishGithub(userId,await getStudyState(userId)),{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"GitHub publication failed."},{status:400});}
}
