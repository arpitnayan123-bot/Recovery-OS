import { cookies } from "next/headers";
import { prisma } from "./recovery";

export const ORG_COOKIE = "ros_org";

export async function getSessionOrg() {
  const store = await cookies();
  const orgId = store.get(ORG_COOKIE)?.value;
  if (!orgId) return null;
  try {
    return await prisma.org.findUnique({ where: { id: orgId } });
  } catch {
    return null;
  }
}

export async function clearSessionOrg() {
  const store = await cookies();
  store.delete(ORG_COOKIE);
}
