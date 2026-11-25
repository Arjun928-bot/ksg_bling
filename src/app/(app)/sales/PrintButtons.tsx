"use client";

import Link from "next/link";

export default function PrintButtons({ id, paper }: { id: string; paper: "a4" | "thermal" }) {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className="btn-gold">Print bill</button>
      <a href={`/sales/${id}/pdf`} className="btn-green">Download PDF</a>
      <Link href={`/sales/${id}?paper=${paper === "a4" ? "thermal" : "a4"}`} className="btn border border-forest/25">
        {paper === "a4" ? "Thermal (80 mm) layout" : "A4 layout"}
      </Link>
    </div>
  );
}
