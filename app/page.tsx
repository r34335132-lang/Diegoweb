"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function Home() {
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (!loading) router.replace(profile?.rol === "entrenador" ? "/dashboard" : "/login");
  }, [loading, profile, router]);

  return <div className="loading-screen"><div className="spinner" /></div>;
}
