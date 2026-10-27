import { logout } from "@/lib/auth";
import { handle } from "@/lib/api";

export const POST = handle(async () => {
  await logout();
});
