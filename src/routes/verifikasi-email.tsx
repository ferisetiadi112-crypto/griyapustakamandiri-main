import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero, SiteLayout } from "@/components/hey/SiteLayout";
import { Panel } from "@/components/hey/primitives";
import { verifyUserEmail } from "@/lib/publishing-platform";

export const Route = createFileRoute("/verifikasi-email")({head:()=>({meta:[{title:"Verifikasi Email — Griya Pustaka Mandiri"}]}),component:VerifyEmail});
function VerifyEmail(){const verify=useServerFn(verifyUserEmail);const [message,setMessage]=useState("Memeriksa tautan verifikasi…");const [ok,setOk]=useState(false);useEffect(()=>{const token=new URLSearchParams(window.location.search).get("token")??"";if(!token){setMessage("Tautan verifikasi tidak lengkap.");return;}void verify({data:{token}}).then(r=>{setOk(r.success);setMessage(r.success?"Email berhasil diverifikasi. Anda dapat masuk dan mengajukan naskah.":r.error);}).catch(()=>setMessage("Verifikasi belum dapat diproses. Silakan coba kembali."));},[]);return <SiteLayout><PageHero eyebrow="Verifikasi Akun" title="Verifikasi email Anda" description="Verifikasi diperlukan sebelum pengajuan naskah dapat dikirim."/><section className="section"><div className="shell"><Panel className="mx-auto max-w-lg p-8 text-center"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">{ok?<CheckCircle2/>:<CircleAlert/>}</span><p role="status" className="mt-4 text-sm">{message}</p><Button asChild variant="hero" className="mt-6"><Link to="/masuk">Masuk ke Akun</Link></Button></Panel></div></section></SiteLayout>;}
}