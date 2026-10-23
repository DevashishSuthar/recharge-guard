// import { redirect } from "next/navigation";
// import { getSessionUserId } from "@/lib/auth";
import { Landing } from "@/components/Landing";

// KEEP IT FOR NOW
// export default async function Home() {
//   const userId = await getSessionUserId();
//   if (userId) redirect("/dashboard");

//   return <Landing />;
// }

// No cookie access here on purpose: the "already logged in → /dashboard"
// redirect lives in proxy.ts, so this page is fully static and served from the
// CDN instead of being rendered on every visit.
export default function Home() {
  return <Landing />;
}