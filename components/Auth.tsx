"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
export default function Auth(){
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [signup,setSignup]=useState(false); const [msg,setMsg]=useState("");
 async function submit(e:React.FormEvent){e.preventDefault(); setMsg("Working…");
  const r=signup?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});
  setMsg(r.error?r.error.message:(signup?"Account created. Check your email if confirmation is enabled.":"Signed in."));
 }
 return <main className="auth-shell"><section className="auth-card"><div className="logo">V</div><p className="eyebrow">Villordon Research Operating System</p><h1>One place for projects, manuscripts, grants, data, and next actions.</h1>
 <form onSubmit={submit} className="stack"><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required/></label><button>{signup?"Create account":"Sign in"}</button></form>
 {msg&&<p className="notice">{msg}</p>}<button className="link" onClick={()=>setSignup(!signup)}>{signup?"Back to sign in":"Create an account"}</button></section></main>
}
