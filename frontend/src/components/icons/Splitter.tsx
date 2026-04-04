export default function SplitterIcon() {
    return (
        <div className="relative group w-fit">
            {/* Overlay */}
            <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 
                            group-hover:opacity-100 transition duration-200 blur-sm" />

            {/* Icon */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-6 transition-all duration-300 ease-in-out 
                           group-hover:scale-150 relative z-10"
                viewBox="0 0 448 512"
            >
                <title>Splitter</title>
                <path
                    fill="currentColor"
                    d="M224 48a56 56 0 1 1 0 112a56 56 0 1 1 0-112M0 256c0-17.7 14.3-32 32-32h384c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32m168 152a56 56 0 1 1 112 0a56 56 0 1 1-112 0"
                />
            </svg>
        </div>
    );
}