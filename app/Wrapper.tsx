// app/dashboard/layout.tsx
"use client"
import React from "react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { Order, OrderStatus } from "./types/order";
import Navbar from "./components/Navbar";
import Link from "next/link";
import StatusBadge from "./components/StatusBadge";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
    const [navbar, setNavbar] = useState(false);
    
      const [orders, setOrders] = useState<Order[]>([]);
      const [loading, setLoading] = useState(true);
      // const [filter, setFilter] = useState<FilterTab>("ALL");
      const [showModal, setShowModal] = useState(false);
  return (
    <div className="flex flex-col justify-center w-full border">
    <div className="w-full sm:max-w-[1800px] sm:mx-aut o">
      <div className="block sm:hidden">
        <Navbar setNavbar={setNavbar} navbar={navbar} />
        </div>
        <header className="bg-white flex justify-between items-center pt-12 px-4 sm:px-12 pb-6 shadow-sm -mt-6 gap-12">
          <div className="flex items-center gap-2">
            <img src="/tracko.svg" alt="logo" className="w-[26px] h-[26px]" />
            <h2 className="text-2xl font-semibold">Tracko</h2>
          </div>
          <div className="pe-3 flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:block">
              <Navbar setNavbar={setNavbar} navbar={navbar} />
            </div>
            <Icon icon="iconamoon:notification-thin" width="24" height="24" className="text-gray-600" />
            <button onClick={() => setNavbar(true)}>
              <Icon icon="material-symbols-light:menu" width="24" height="24" className="text-gray-600 block sm:hidden" />
            </button>
          </div>
        </header>
      <section className="dashboard-content bg-gray-100">{children}</section>
    </div>
    </div>
  )
}
