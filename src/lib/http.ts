import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import type { z } from "zod";

export const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
export const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
export const badRequest = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });

/**
 * Reads + validates a JSON body in one step. A malformed body used to throw
 * inside `req.json()` and surface as a 500; now it is a clean 400.
 */
export async function parseBody<S extends z.ZodType>(
  req: Request,
  schema: S
): Promise<{ ok: true; data: z.output<S> } | { ok: false; response: NextResponse }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { ok: false, response: badRequest("Request body must be valid JSON") };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, response: badRequest(parsed.error.issues[0]?.message ?? "Invalid request") };
  }
  return { ok: true, data: parsed.data };
}

/** True when Prisma could not find the row to update/delete (code P2025). */
export function isRecordNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

/** Client IP as set by the platform proxy (trustworthy on Vercel). */
export function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
