import PublicNav from "@/components/layout/PublicNav";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PartnersSection from "@/components/landing/PartnersSection";
import UserMarquee from "@/components/landing/UserMarquee";
import StatsSection from "@/components/landing/StatsSection";
import Footer from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-white dark:bg-gray-950">
      <PublicNav />
      <HeroSection />
      <FeaturesSection />
      <PartnersSection />
      <UserMarquee />
      <StatsSection />
      <Footer />
    </div>
  );
}
