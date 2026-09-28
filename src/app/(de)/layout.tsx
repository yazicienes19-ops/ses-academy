import { Rahmen } from "@/components/Rahmen";

export default function DeutschLayout({ children }: { children: React.ReactNode }) {
  return <Rahmen l="de">{children}</Rahmen>;
}
