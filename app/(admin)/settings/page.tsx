"use client";

import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import { createAdminUser, type AdminRole } from "@/lib/api/auth";

export default function SettingsPage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("admin");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createAdminUser(email, password, role);
      showSuccess(role === "scanner" ? "Door staff account created." : "Admin user created.");
      setEmail("");
      setPassword("");
      setRole("admin");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to create account.");
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
          <p className="text-xs text-[#8C8C78] mt-1 capitalize">{user?.role === "scanner" ? "Door staff" : "Admin"}</p>
        </div>
      </div>

      {user?.role === "admin" && (
        <div>
          <h2 className="text-base font-semibold text-[#4A4A3C] mb-3">Create an account</h2>
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
            <Select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole)}
              hint="Door staff can only scan/look up tickets — no access to the rest of the dashboard."
            >
              <option value="admin">Admin — full access</option>
              <option value="scanner">Door staff — ticket scanning only</option>
            </Select>
            <div>
              <Button type="submit" loading={loading}>
                Create account
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
