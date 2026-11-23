"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n";

function Gate() {
  const tr = useT();
  const params = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/access", { method: "POST", body: JSON.stringify({ code }) });
    setBusy(false);
    if (res.ok) window.location.href = params.get("next") || "/";
    else setError(true);
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-20">
      <form onSubmit={submit} className="card space-y-4 p-6">
                <h1 className="text-xl font-bold text-brand-900">{tr("심사용 비공개 데모", "Private demo for judges")}</h1>
        <p className="text-sm text-slate-600">{tr("안내받은 입장 코드를 입력해 주세요.", "Enter the access code you were given.")}</p>
        <input
          className="input"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(false);
          }}
          placeholder={tr("입장 코드", "Access code")}
          autoFocus
        />
        {error && <p className="text-sm text-red-600">{tr("코드가 맞지 않아요.", "That code is not correct.")}</p>}
        <button className="btn-primary w-full" disabled={busy || !code}>
          {tr("입장하기", "Enter")}
        </button>
      </form>
    </main>
  );
}

export default function GatePage() {
  return (
    <Suspense>
      <Gate />
    </Suspense>
  );
}
