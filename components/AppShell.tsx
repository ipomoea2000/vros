"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
export default function AppShell({children,email}:{children:React.ReactNode,email?:string|null}){
 const path=usePathname();
 const items=[["/","Dashboard"],["/#projects","Projects"],["/#manuscripts","Manuscripts"],["/#grants","Grants"],["/#tasks","Tasks"]];
 return <div className="shell"><aside className="sidebar"><div className="brand"><div className="logo">V</div><div><b>VROS</b><small>Research Operating System</small></div></div>
 <nav>{items.map(([href,label])=><Link key={label} href={href} className={path===href||path.startsWith("/projects")&&label==="Projects"?"active":""}>{label}</Link>)}</nav>
 <div className="side-bottom"><small>{email}</small><button className="dark" onClick={()=>supabase.auth.signOut()}>Sign out</button></div></aside><main className="main">{children}</main></div>
}
