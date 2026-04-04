import { useState } from "react";

import { Header } from "../Layout/Header";
import Sidebar from "../Layout/Sidebar";

import Tuner from "../Features/Tuner";
import Splitter from "../Features/Splitter";

export function Home() {
    const [expanded, setExpanded] = useState(false);
    const [feature, setFeature] = useState("splitter");

    const renderFeature = () => {
        switch (feature) {
            case "tuner":
                return <Tuner />;
            case "splitter":
                return <Splitter />;
            default:
                return <Splitter />;
        }
    };

    return (
        <>
            <Header /> 
            <div className="flex">
                <Sidebar 
                    expanded={expanded} 
                    toggleSidebar={() => setExpanded(!expanded)} 
                    setFeature={setFeature}
                    feature={feature}
                />

                <div className="flex-1 p-4 mx-10 my-3 bg-gray-950 rounded-2xl shadow-2xl shadow-sky-50">  
                    {renderFeature()}
                </div>      
            </div>    
        </>
    );
}