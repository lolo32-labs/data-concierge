// GET /api/chat/history — Load chat history for the authenticated store.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { pool } from "@/lib/pool";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.storeId) {
    return NextResponse.json({ noStore: true, error: "No store connected" }, { status: 200 });
  }

  const result = await pool.query(
    `SELECT role, content, created_at
     FROM chat_messages
     WHERE store_id = $1
     ORDER BY created_at ASC
     LIMIT 100`,
    [session.user.storeId]
  );

  return NextResponse.json({ messages: result.rows });
}
