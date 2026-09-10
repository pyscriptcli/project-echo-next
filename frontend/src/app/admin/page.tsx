"use client";
import { useEffect, useState } from "react";
import { AdminConfiguration } from "@/components/forms/FormsPortal";
export default function AdminPage() { const [user,setUser]=useState<any>(null); const [checked,setChecked]=useState(false); useEffect(()=>{fetch('/api/auth/me').then(r=>r.ok?r.json():null).then(d=>{setUser(d?.user||d||null);setChecked(true)}).catch(()=>setChecked(true))},[]); if(!checked)return <main className="p-8">Loading…</main>; if(!user)return <main className="p-8">Admin access required.</main>; return <AdminConfiguration userEmail={user.email} username={user.username}/>; }
