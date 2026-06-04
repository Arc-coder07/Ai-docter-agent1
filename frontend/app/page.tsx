import Footer from "@/components/sections/footer";
import Header from "@/components/sections/header";
import Hero from "@/components/sections/hero";
import StatsBar from "@/components/sections/stats-bar";
import BentoFeatures from "@/components/sections/bento-features";
import Capabilities from "@/components/sections/capabilities";
import TechStack from "@/components/sections/tech-stack";
import CTA from "@/components/sections/cta";

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <StatsBar />
      <Capabilities />
      <BentoFeatures />
      <TechStack />
      <CTA />
      <Footer />
    </main>
  );
}
