"use client";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import type {User} from "@supabase/supabase-js";
import {supabase} from "@/lib/supabase";
import Auth from "@/components/Auth";
import ProjectWorkspace from "@/components/ProjectWorkspace";
export default function ProjectPage(){const {id}=useParams<{id:string}>();const [u,setU]=useState<User|null>(null),[ready,setReady]=useState(false);
 useEffect(()=>{supabase.auth.getUser().then(({data})=>{setU(data.user);setReady(true)});const {data}=supabase.auth.onAuthStateChange((_e,s)=>setU(s?.user||null));return()=>data.subscription.unsubscribe()},[]);
 if(!ready)return <main className="auth-shell"><section className="auth-card">Loading project…</section></main>;return u?<ProjectWorkspace user={u} id={id}/>:<Auth/>}
