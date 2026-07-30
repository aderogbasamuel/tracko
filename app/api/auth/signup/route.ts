import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
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
  const { name, email, password } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  }

  const contents = await readFile(usersPath, "utf8");
  const users = JSON.parse(contents) as UserRecord[];

  if (users.some((user) => user.email.toLowerCase() === String(email).toLowerCase())) {
    return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });
  }

  const newUser: UserRecord = {
    id: crypto.randomUUID(),
    name: String(name),
    email: String(email),
    password: String(password),
  };

  users.push(newUser);
  await writeFile(usersPath, JSON.stringify(users, null, 2), "utf8");

  return NextResponse.json({ user: { id: newUser.id, name: newUser.name, email: newUser.email } });
}
