import SplitterIcon from "../icons/Splitter";
import PitchD from "../icons/Pitch";
import Tuner from "../icons/Tuner";
import Karaoke from "../icons/Karaoke";
import Store from "../icons/Store";
import Blogs from "../icons/Blogs";
import Expand from "../icons/Expand";

interface SidebarProps {
    expanded: boolean;
    toggleSidebar: () => void;
    feature: string; 
    setFeature: (feature: string) => void;
}

export default function Sidebar({
    expanded,
    toggleSidebar,
    feature,
    setFeature,
}: SidebarProps) {

    const itemClass = (name: string) =>
        `p-4 flex items-center gap-2 cursor-pointer rounded-2xl mx-2 transition-all duration-300
        ${feature === name
            ? "bg-gray-500 text-black"
            : "hover:bg-gray-300 hover:text-black"
        }`;

    return (
        <div
            className={`h-screen italic font-mono ml-2 py-10 my-3 bg-fuchsia-950 border border-e-orange-300 text-yellow-500 
            ${expanded ? "w-50" : "w-20"} justify-center rounded-2xl transition-all duration-300 ease-in-out`}
        >

            {/* Toggle */}
            <div
                className="p-4 mx-2 flex cursor-pointer"
                onClick={toggleSidebar}
            >
                <Expand />
            </div>

            {/* Splitter */}
            <div
                className={itemClass("splitter")}
                onClick={() => setFeature("splitter")}
            >
                <SplitterIcon />
                {expanded && <span>Splitter</span>}
            </div>

            {/* Tuner */}
            <div
                className={itemClass("tuner")}
                onClick={() => setFeature("tuner")}
            >
                <Tuner />
                {expanded && <span>Tuner</span>}
            </div>

            {/* Pitch */}
            <div
                className={itemClass("pitch")}
                onClick={() => setFeature("pitch")}
            >
                <PitchD />
                {expanded && <span>Pitch Detector</span>}
            </div>

            {/* Karaoke */}
            <div
                className={itemClass("karaoke")}
                onClick={() => setFeature("karaoke")}
            >
                <Karaoke />
                {expanded && <span>Karaoke</span>}
            </div>

            {/* Store */}
            <div
                className={itemClass("store")}
                onClick={() => setFeature("store")}
            >
                <Store />
                {expanded && <span>Store</span>}
            </div>

            {/* Blogs */}
            <div
                className={itemClass("blogs")}
                onClick={() => setFeature("blogs")}
            >
                <Blogs />
                {expanded && <span>Blogs</span>}
            </div>

        </div>
    );
}