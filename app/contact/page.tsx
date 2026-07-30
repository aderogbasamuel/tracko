import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-16 px-4">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 shadow-lg shadow-slate-200/40">
        <h1 className="text-3xl font-bold text-slate-900">Contact</h1>
        <p className="mt-3 text-slate-600">Have a question about Tracko? Reach out and we’ll get back to you soon.</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900">Email</h2>
            <p className="mt-3 text-slate-500">support@tracko.app</p>
          </div>
          <div className="rounded-3xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900">Phone</h2>
            <p className="mt-3 text-slate-500">+234 800 123 4567</p>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="font-semibold text-slate-900">Visit</h2>
          <p className="mt-2 text-slate-500">Tracko HQ, Lagos, Nigeria</p>
          <Link href="/" className="mt-4 inline-flex text-[#2adadd] hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
