"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "LOCKED_OUT" || err.status === 429) {
          setError("Too many failed attempts. Please wait 15 minutes before trying again.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image src="/crystalcity-logo.png" alt="CrystalCity" width={48} height={48} />
          <div className="text-center">
            <h1 className="text-lg font-semibold text-[#4A4A3C]">CrystalCity Admin</h1>
            <p className="text-sm text-[#8C8C78]">Sign in to manage shows, orders and more</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-[#EDEAE0] p-6">
          <Input
            id="email"
            label="Email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={loading} className="w-full mt-2">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
