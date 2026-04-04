export default function Store() {
    return (
        <div className="relative group w-fit">

            <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 
                            group-hover:opacity-100 transition duration-200 blur-sm" />

            <svg xmlns="http://www.w3.org/2000/svg" 
                className="w-8 h-6 transition-all duration-300 ease-in-out 
                           group-hover:scale-150 relative z-10" 
                viewBox="0 0 48 48"><title>Store</title><g fill="none" stroke="currentColor" stroke-width="4"><path stroke-linejoin="round" d="M6 15h36l-2 27H8z" clip-rule="evenodd"/><path stroke-linecap="round" stroke-linejoin="round" d="M16 19V6h16v13"/>
                <path stroke-linecap="round" d="M16 34h16"/></g>
            </svg>

        </div>    
    )
}