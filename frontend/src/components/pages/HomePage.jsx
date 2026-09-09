import { Hero } from "@/components/sections/Hero";
import { SabbathMarquee } from "@/components/sections/SabbathMarquee";
import { SabbathSection } from "@/components/sections/SabbathSection";
import { WelcomeSection } from "@/components/sections/WelcomeSection";
import { EventsSection } from "@/components/sections/EventsSection";
import { DepartmentsSection } from "@/components/sections/DepartmentsSection";
import { MediaSection } from "@/components/sections/MediaSection";
import { DigitalMinistrySection } from "@/components/sections/DigitalMinistrySection";
import { VisitCTA } from "@/components/sections/VisitCTA";

export default function HomePage() {
    return (
        <>
            <Hero />
            <SabbathMarquee />
            <SabbathSection />
            <WelcomeSection />
            <EventsSection />
            <DepartmentsSection />
            <MediaSection />
            <DigitalMinistrySection />
            <VisitCTA />
        </>
    );
}
