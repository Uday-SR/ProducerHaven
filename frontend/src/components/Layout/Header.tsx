import { Profile } from "../icons/Profile";
import "./../../App.css"

export function Header() {
    return (
        <header className="flex bitcount-grid-double-x justify-between mx-2 my-1 rounded-tl-2xl rounded-br-2xl text-2xl border-yellow-300 border-y-1  px-2 py-3 backdrop-blur-sm">
            <div>ProdHaven</div>
            <div><Profile/></div>
        </header>
    );
}