import { redirect } from "next/navigation";

// Preserve old bookmarks, email confirmation links and existing marketing URLs.
export default function LegacyMerchantLoginRoute() {
  redirect("/merchant/account?mode=login");
}
