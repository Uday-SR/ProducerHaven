import { Profile } from "../icons/Profile";
import Splitter from "../icons/Splitter";
import { Pitch } from "../icons/Pitch";
import Tuner from "../icons/Tuner";
import Karaoke from "../icons/Karaoke";
import Store from "../icons/Store";
import Blogs from "../icons/Blogs";

interface SidebarProps {
    expanded: boolean;
    toggleSidebar: () => void;
}

export default function Sidebar({ expanded, toggleSidebar}: SidebarProps) {
    return (

        <div className={`h-screen ml-2 py-15 mt-3 bg-fuchsia-950 border border-e-orange-300 text-yellow-500 ${expanded ? "w-50" : "w-21"} rounded-2xl position-fixed`}>

            <div className="p-4 flex hover:cursor-pointer" onClick={toggleSidebar}>
                <div><Splitter /></div>
                { expanded && <div>
                    Splitter</div> }
            </div>

            <div className="p-4 flex hover:cursor-pointer">
                <div><Tuner /></div>
                { expanded && <div>
                    Tuner</div> }
            </div>

            <div className="p-4 flex hover:cursor-pointer">
                <div><Pitch /></div>
                { expanded && <div>
                    Pitch Detection</div> }
            </div>

            <div className="p-4 flex hover:cursor-pointer"> 
                <div><Karaoke /></div>
                { expanded && <div>
                    Karaoke</div> }
            </div>

            <div className="p-4 flex hover:cursor-pointer">
                <div><Store /></div>
                { expanded && <div>
                    Store</div> }
            </div>

            <div className="p-4 flex hover:cursor-pointer">
                <div><Blogs /></div>
                { expanded && <div>
                    Blogs</div> }
            </div>

        </div>
    )
}