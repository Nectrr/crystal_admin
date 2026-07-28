"use client";

import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import { createAdminUser } from "@/lib/api/auth";

export default function SettingsPage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createAdminUser(email, password);
      showSuccess("Admin user created.");
      setEmail("");
      setPassword("");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to create admin user.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <PageHeader title="Settings" description="Account and admin access" />
        <div className="rounded-xl border border-[#EDEAE0] p-5 max-w-md">
          <p className="text-sm text-[#8C8C78]">Signed in as</p>
          <p className="text-base font-medium text-[#4A4A3C]">{user?.email}</p>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-[#4A4A3C] mb-3">Create another admin</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Password"
            type="password"
            required
            minLength={8}
            hint="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div>
            <Button type="submit" loading={loading}>
              Create admin user
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
