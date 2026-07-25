"use client";

import { useRouter } from "next/navigation";
import CustomButton from "@/components/site/CustomButton";

export default function NotFound() {
  const router = useRouter();

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you are looking for does not exist or the URL is incorrect.</p>
      <CustomButton text="Go Back" onClick={() => router.push("/")} />
    </div>
  );
}
