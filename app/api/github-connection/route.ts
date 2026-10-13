import { userIdFromRequest } from "@/lib/study-state";
import { connectGithub, disconnectGithub, githubConnection } from "@/lib/github-publishing";
export const dynamic = "force-dynamic";
const headers = {"Cache-Control":"no-store"};
function errorResponse(error: unknown) {return Response.json({error:error instanceof Error?error.message:"GitHub connection failed."},{status:400,headers});}
function checkOrigin(request: Request) {if(request.headers.get("origin") !== new URL(request.url).origin) throw new Error("Open GitHub setup from your tracker.");}
export async function GET(request: Request) {
  try {return Response.json(await githubConnection(userIdFromRequest(request)),{headers});} catch(error){return errorResponse(error);}
}
export async function POST(request: Request) {
  try {
    const userId=userIdFromRequest(request);checkOrigin(request);
    const input=await request.text();if(input.length>2000)throw new Error("The connection request is too large.");
    const token=JSON.parse(input).token;if(typeof token!=="string")throw new Error("Enter a restricted GitHub token.");
    await connectGithub(userId,token.trim());return Response.json({connected:true},{headers});
  } catch(error){return errorResponse(error);}
}
export async function DELETE(request: Request) {
  try {const userId=userIdFromRequest(request);checkOrigin(request);await disconnectGithub(userId);return Response.json({connected:false},{headers});}catch(error){return errorResponse(error);}
}
