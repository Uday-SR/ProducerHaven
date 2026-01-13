import { Header } from "../Layout/Header";
import Tuner from "../Features/Tuner";
import Splitter from "../Features/Splitter";
import Sidebar from "../Layout/Sidebar";

export function Home() {
    return (
        <>
            <Header /> 
            <div className="flex">
                <Sidebar expanded={false} toggleSidebar={() => {}} />
                <div className="flex-1 p-4">  
                    <Tuner />
                </div>      
            </div>    
        </>    
    );
}