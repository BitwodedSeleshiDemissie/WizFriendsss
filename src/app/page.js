import Navbar from "../components/Navbar";
import HeroSection from "../components/HeroSection";
import FeaturesSection from "../components/FeaturesSection";
import ImageCarousel from "../components/ImageCarousel";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <main className="overflow-x-hidden bg-white text-gray-900">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <ImageCarousel />
      <Footer />
    </main>
  );
}
