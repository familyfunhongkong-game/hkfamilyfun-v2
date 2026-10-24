import { redirect } from "next/navigation";

// Preserve old bookmarks, email confirmation links and existing marketing URLs.
export default function LegacyMerchantRegisterRoute() {
  redirect("/merchant/account?mode=register");
}
