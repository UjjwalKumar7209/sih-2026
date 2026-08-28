import Link from 'next/link';
import { ArrowLeft, Heart, HelpCircle, Cpu } from 'lucide-react';

export const metadata = {
  title: 'About | SIH Industrial Fire AI',
  description: 'Learn about our smart satellite fire monitoring system in very simple terms!'
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 md:p-12 font-telemetry select-none flex flex-col justify-between">
      <div className="max-w-3xl mx-auto space-y-8 w-full">
        
        {/* Header Navigation */}
        <div className="flex justify-between items-center border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-[#e04300] animate-pulse" />
            <h1 className="text-xl font-bold uppercase tracking-wider text-zinc-900">About Our Project</h1>
          </div>
          <Link 
            href="/" 
            className="brutalist-button flex items-center gap-2 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* Section 1: What is this project? */}
        <section className="brutalist-card bg-[var(--surface)] p-6 border-2 border-[var(--border)] space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#e04300] flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            What is this project?
          </h2>
          <p className="text-xs leading-relaxed text-zinc-700">
            Imagine we have giant <strong>flying cameras</strong> high up in space, way above the clouds. We call these cameras <strong>satellites</strong>. 
            They fly around the Earth and look for very hot things, like giant candles or warm spots. 
          </p>
          <p className="text-xs leading-relaxed text-zinc-700">
            Our project, <strong>Industrial Fire AI</strong>, is like a smart computer friend that looks at these space pictures. It finds the hot spots and shows them on a map so we can see if a big factory is getting too hot and might catch fire!
          </p>
        </section>

        {/* Section 2: What problem does it solve? */}
        <section className="brutalist-card bg-[var(--surface)] p-6 border-2 border-[var(--border)] space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#e04300] flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            What problem does it solve?
          </h2>
          <p className="text-xs leading-relaxed text-zinc-700">
            Sometimes, factories get too hot and can have bad fires. We want to stop that! But the flying cameras see <em>every</em> hot thing on the ground. They see farmers burning dry grass, campfires, or even hot sand in the desert. That makes too many false alarms!
          </p>
          <p className="text-xs leading-relaxed text-zinc-700">
            Our smart computer brain helps solve this. It looks at all the hot spots and says: 
            <span className="block mt-2 pl-3 border-l-2 border-[#e04300] italic text-zinc-550 font-medium">
              &quot;Hey, this one is a real factory that needs warning, but that one is just a small grass fire!&quot;
            </span>
          </p>
          <p className="text-xs leading-relaxed text-zinc-700">
            By finding the real dangers quickly, we can send a message to the factory: <strong>&quot;Please cool down before a fire starts!&quot;</strong> This keeps people and trees safe.
          </p>
        </section>

        {/* Section 3: The Tech Stack (Our Toys and Tools) */}
        <section className="brutalist-card bg-[var(--surface)] p-6 border-2 border-[var(--border)] space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#e04300]">
            The Toy Box (Full Tech Stack)
          </h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">
            Here are the clever tools we used to build this:
          </p>
          
          <div className="space-y-3 font-mono text-xs">
            <div className="border border-[var(--border)] p-3 bg-zinc-50">
              <span className="text-[#e04300] font-bold block mb-1">🚀 Space Cameras (NASA FIRMS API)</span>
              <p className="text-[10px] text-zinc-600">
                The satellite connection that sends us messages whenever they see a hot spot on Earth.
              </p>
            </div>

            <div className="border border-[var(--border)] p-3 bg-zinc-50">
              <span className="text-[#e04300] font-bold block mb-1">🧠 Smart Helper Brain (Random Forest & ONNX Runtime)</span>
              <p className="text-[10px] text-zinc-600">
                A mathematical robot brain that guesses whether a hot spot is a factory fire or a harmless grass fire.
              </p>
            </div>

            <div className="border border-[var(--border)] p-3 bg-zinc-50">
              <span className="text-[#e04300] font-bold block mb-1">🗺️ Interactive Drawing Map (Leaflet GIS)</span>
              <p className="text-[10px] text-zinc-600">
                A big drawing of India that places little colored circles on the exact spots where the satellites see heat.
              </p>
            </div>

            <div className="border border-[var(--border)] p-3 bg-zinc-50">
              <span className="text-[#e04300] font-bold block mb-1">🏢 Factory Address Book (Overpass API / OpenStreetMap)</span>
              <p className="text-[10px] text-zinc-600">
                A massive list that helps the computer look around the hot spot to find if there is an industrial building nearby.
              </p>
            </div>

            <div className="border border-[var(--border)] p-3 bg-zinc-50">
              <span className="text-[#e04300] font-bold block mb-1">💻 Dashboard Frame (Next.js, React & TypeScript)</span>
              <p className="text-[10px] text-zinc-600">
                The programming bricks that make our buttons click, fetch data, and load pages instantly.
              </p>
            </div>

            <div className="border border-[var(--border)] p-3 bg-zinc-50">
              <span className="text-[#e04300] font-bold block mb-1">🎨 Colorful Paints (Tailwind CSS)</span>
              <p className="text-[10px] text-zinc-600">
                The styling code that decorates the buttons, borders, and colors to make the dashboard look like a clean retro computer.
              </p>
            </div>
          </div>
        </section>

      </div>

      {/* Footer system status */}
      <footer className="bg-[var(--surface-header)] border-t border-[var(--border)] p-3 text-[10px] text-zinc-600 text-center font-telemetry uppercase tracking-wider mt-12 w-full">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>
            SIH Industrial Fire AI Prototype &copy; {new Date().getFullYear()}
          </span>
          <span className="flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 bg-[#008f47] rounded-full inline-block animate-pulse"></span>
            Operational Diagnostics: ACTIVE | CPU Node Engine: ONLINE
          </span>
        </div>
      </footer>
    </div>
  );
}
