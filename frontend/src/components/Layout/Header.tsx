import { Profile } from "../icons/Profile";

export function Header() {
    return (
        <header className="flex justify-between mx-2 my-3 rounded-tl-2xl rounded-br-2xl text-2xl border-yellow-300 border-y-1 bg-gray-950 px-2 py-3">
            <div>ProdHaven</div>
            <div><Profile/></div>
        </header>
    );
}