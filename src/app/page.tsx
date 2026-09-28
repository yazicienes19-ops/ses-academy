import { Hero } from "@/components/sections/Hero";
import { Pillars } from "@/components/sections/Pillars";
import { NextEvent } from "@/components/sections/NextEvent";
import { Quote } from "@/components/sections/Quote";
import { Newsletter } from "@/components/sections/Newsletter";

export default function Home() {
  return (
    <>
      <Hero />
      <Pillars />
      <NextEvent />
      <Quote />
      <Newsletter />
    </>
  );
}
