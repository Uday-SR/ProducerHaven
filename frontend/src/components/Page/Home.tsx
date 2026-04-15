import { useState } from "react";

import { Header } from "../Layout/Header";
import Sidebar from "../Layout/Sidebar";

import Tuner from "../Features/Tuner/Tuner";
import Splitter from "../Features/Splitter";
import Master from "../Features/Master/Master";


export function Home() {
    const [expanded, setExpanded] = useState(false);
    const [feature, setFeature] = useState("splitter");

    const renderFeature = () => {
        switch (feature) {
            case "tuner":
                return <Tuner />;
            case "splitter":
                return <Splitter />;
            case "master":
                return <Master />    
            default:
                return <Tuner />;
        }
    };

    return (
        <>
            <Header /> 
            <div className="flex">
                <div className="fixed">
                    <Sidebar 
                        expanded={expanded} 
                        toggleSidebar={() => setExpanded(!expanded)} 
                        setFeature={setFeature}
                        feature={feature}
                    />
                </div>    

                <div className="flex-1 p-4 mx-10 my-3 bg-gray-950 rounded-2xl shadow-2xl shadow-sky-50">  
                    {renderFeature()}
                </div>      
            </div>    
        </>
    );
}