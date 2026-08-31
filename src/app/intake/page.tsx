import type { Metadata } from "next";
import { SmartIntake } from "@/features/intake/components/smart-intake";

export const metadata: Metadata = { title: "Smart Intake" };

export default function IntakePage() {
  return <SmartIntake />;
}
