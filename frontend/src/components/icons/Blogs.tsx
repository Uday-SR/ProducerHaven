export default function Blogs() {
    return (

        <div className="relative group w-fit">

            <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 
                            group-hover:opacity-100 transition duration-200 blur-sm" />

            <svg xmlns="http://www.w3.org/2000/svg" 
                className="w-8 h-6 transition-all duration-300 ease-in-out 
                           group-hover:scale-150 relative z-10" 
                viewBox="0 0 20 20"><title>Blogs</title>
                <path fill="currentColor" d="m16.89 1.2l1.41 1.41c.39.39.39 1.02 0 1.41L14 8.33V18H3V3h10.67l1.8-1.8c.4-.39 1.03-.4 1.42 0m-5.66 8.48l5.37-5.36l-1.42-1.42l-5.36 5.37l-.71 2.12z"/>
            </svg>
        </div>    
    )
}