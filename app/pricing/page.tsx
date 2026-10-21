import { redirect } from "next/navigation";

// Pricing moved to the credits model — /topup is the single buy page.
export default function PricingPage() {
  redirect("/topup");
}
