import { Hero } from "@/components/sections/Hero";
import { AnnouncementBanner } from "@/components/sections/AnnouncementBanner";
import { SabbathMarquee } from "@/components/sections/SabbathMarquee";
import { SabbathSection } from "@/components/sections/SabbathSection";
import { WelcomeSection } from "@/components/sections/WelcomeSection";
import { EventsSection } from "@/components/sections/EventsSection";
import { DepartmentsSection } from "@/components/sections/DepartmentsSection";
import { MediaSection } from "@/components/sections/MediaSection";
import { DigitalMinistrySection } from "@/components/sections/DigitalMinistrySection";
import { VisitCTA } from "@/components/sections/VisitCTA";

/**
 * @param {{ announcements?: any[], events?: any[] | null, sectionMedia?: any }} props
 */
export default function HomePage({ announcements = [], events = null, sectionMedia = null }) {
    return (
        <>
            <Hero sectionMedia={sectionMedia} />
            {announcements && announcements.length > 0 && (
                <AnnouncementBanner announcements={announcements} />
            )}
            <SabbathMarquee />
            <SabbathSection />
            <WelcomeSection sectionMedia={sectionMedia} />
            <EventsSection events={events} />
            <DepartmentsSection />
            <MediaSection />
            <DigitalMinistrySection />
            <VisitCTA />
        </>
    );
}
