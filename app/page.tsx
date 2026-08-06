"use client";
import {useEffect,useState} from "react";
import type {User} from "@supabase/supabase-js";
import {supabase} from "@/lib/supabase";
import Auth from "@/components/Auth";
import HomeClient from "@/components/HomeClient";
export default function Page(){const [u,setU]=useState<User|null>(null),[ready,setReady]=useState(false);
 useEffect(()=>{supabase.auth.getUser().then(({data})=>{setU(data.user);setReady(true)});const {data}=supabase.auth.onAuthStateChange((_e,s)=>{setU(s?.user||null);setReady(true)});return()=>data.subscription.unsubscribe()},[]);
 if(!ready)return <main className="auth-shell"><section className="auth-card">Loading VROS…</section></main>;return u?<HomeClient user={u}/>:<Auth/>}
