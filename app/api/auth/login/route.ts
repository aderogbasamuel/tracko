import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const usersPath = path.join(process.cwd(), "data", "users.json");

type UserRecord = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const contents = await readFile(usersPath, "utf8");
  const users = JSON.parse(contents) as UserRecord[];
  const user = users.find((item) => item.email.toLowerCase() === String(email).toLowerCase());

  if (!user || user.password !== password) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
}
