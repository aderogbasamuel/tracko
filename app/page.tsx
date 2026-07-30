"use client"
import React from "react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { Order, OrderStatus } from "./types/order";
import Navbar from "./components/Navbar";
import Link from "next/link";
import StatusBadge from "./components/StatusBadge";

const Stats =
  [
    {
      title: "Total Orders",
      stat: "50",
      link: "/orders",
    },
    {
      title: "Paid Orders",
      stat: "20",
      link: "/orders?filter=PAID",
    },
    {
      title: "Pending Orders",
      stat: "30",
      link: "/orders?filter=PENDING",
    },
  ]



export default function Home() {
  const [navbar, setNavbar] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  // const [filter, setFilter] = useState<FilterTab>("ALL");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data.slice(0, 5));
    setLoading(false);
  }

  //   const [orders, setOrders] = useState([
  //   {
  //     customer: "Jane Doe",
  //     item: "Software Engineer",
  //     status: "Active",
  //     action: "Edit",
  //   },
  //   {
  //     customer: "Samuel N.",
  //     item: "Food Delivery",
  //     status: "Pending",
  //     action: "Details",
  //   },
  //   {
  //     customer: "Chidi Okoro",
  //     item: "Gadgets",
  //     status: "Delivered",
  //     action: "View",
  //   },
  // ]);

  const [showAddOrder, setShowAddOrder] = useState(false);

  const handleAddOrder = () => {
    // Logic to open the AddOrder component/modal
    setShowAddOrder(true);
  }
  return (
    <div className="flex flex-col justify-center w-full border">
    <div className="max-w-[1800px] mx-auto">
      {showAddOrder && <AddOrder setShowAddOrder={setShowAddOrder} setOrders={setOrders} />}
      <div className="bg-gray-100 py-6 pt-0 flex flex-col gap-6">
        <div className="block sm:hidden">
        <Navbar setNavbar={setNavbar} navbar={navbar} />
        </div>
        <header className="bg-white flex justify-between items-center pt-12 px-4 sm:px-6 pb-6 shadow-sm -mt-6 gap-12">
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
        {/* card */}
        <div className="px-4">
          <h3 className="font-bold text-xl">Dashboard</h3>
          <div className="bg-linear-to-tr from-[#2ADADD] to-[#176C77] rounded-xl py-4 px-4 mt-6">
            <p className="text-white font-medium text-[18px] max-w-[260px]">
              You made ₦45,000 this week, up 20%.  Chidi is your top customer with 3 orders."
            </p>
            <button className="bg-[#FFBB01] mt-3 text-[12px] rounded-md font-medium p-3 py-[6px] shadow-sm">Refresh Insight</button>
          </div>
        </div>
        <div className="mt-6 px-4">
          <h2 className="font-semibold text-xl">Stats</h2>

          <div className="grid grid-cols-2 gap-4 mt-4">

            {Stats.map((stat, index) => (
              <Link href={stat.link} className="bg-[#2adadd44] border-[#2adadd] shadow-sm border py-4 px-4 flex flex-col gap-2 pt-8 rounded-xl w-full pe-6 relative" key={index}>
                <h3 className="font-bold text-3xl leading-none ">{stat.stat}</h3>
                <span className="text-sm font-semibold text-gray-600 mb-[1px] ">{stat.title}</span>
                <Icon icon={"iconamoon:arrow-right-2-bold"} width={24} height={24} className="absolute right-3 top-[35%] text-gray-500" />
              </Link>
            ))}


          </div>
        </div>

        <div className="mt-6 px-4">
          <h3 className="font-semibold text-xl">Recent Orders List</h3>
          {/* <table>
            <tr>
              <th>Customer Name</th>
              <th>item</th>
              <th>Status Badge</th>
              <th>Action</th>
            </tr>
            <tr>
              <td>Samuel</td>
              <td>Food</td>
              <td>Delivered</td>
              <td>
                <Icon icon={"wordpress:details"} width={24} height={24}/>
              </td>
            </tr>
          </table> */}


          <div className="mt-4 w-full overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
            <table className="w-full table-auto border-collapse text-left text-sm text-slate-600">
              {/* <!-- Header --> */}
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>

              {/* <!-- Body --> */}
              <tbody className="divide-y divide-slate-200 bg-white">
                {orders.map((order, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{order.customerName}</td>
                    <td className="px-6 py-4">{order.item}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">{order.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <a href={`/orders/${order.id}`} className="font-medium text-indigo-600 hover:text-indigo-900 underline">Details</a>
                    </td>
                  </tr>
                ))}

                {/* {orders.map((order) => (
                            <Link
                              key={order.id}
                              href={`/orders/${order.id}`}
                              className="block border rounded-lg p-3 hover:bg-gray-50"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{order.customerName}</p>
                                  <p className="text-sm text-gray-500">{order.item}</p>
                                </div>
                                <div className="text-right space-y-1">
                                  <p className="text-sm font-medium">
                                    ₦{order.price.toLocaleString()}
                                  </p>
                                  <StatusBadge status={order.status} />
                                </div>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </Link>
                          ))} */}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      <button onClick={handleAddOrder} className="fixed bottom-6 right-6 bg-[#2adadd] p-4 rounded-full shadow-lg">
        <Icon icon={"ph:plus-bold"} width={24} height={24} className=" text-white" />
      </button>
    </div>
    </div>
  );
}


const AddOrder = ({ setShowAddOrder, setOrders }: { setShowAddOrder: React.Dispatch<React.SetStateAction<boolean>>; setOrders: React.Dispatch<React.SetStateAction<any[]>> }) => {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    customer: "",
    item: "",
    status: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdding(true);
    // Simulate an API call
    setTimeout(() => {
      console.log("Order added:", form);
      setAdding(false);
      setShowAddOrder(false);
      setOrders((prevOrders) => [...prevOrders, form]);
    }, 2000);
  }
  return (
    <div className="fixed h-full z-10 w-full top-0 left-0 flex items-end justify-center">
      <div className="bg-black/20 h-full w-full absolute top-0 right-0 z-12 pointer-events-none" aria-hidden="true" onClick={() => setShowAddOrder(false)}></div>
      <div className="fixed bottom-0 left-0 w-full h-[50%] bg-white rounded-t-xl shadow-lg p-4 z-20 border-t-2 border-gray-200 flex items-center">
        <div className="w-full -mt-10">
          <Icon icon={"iconamoon:close-bold"} width={28} height={28} className="absolute right-6 top-10 text-gray-600 cursor-pointer" onClick={() => setShowAddOrder(false)} />
          <h2 className="text-2xl font-semibold my-4">Add New Order</h2>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <input type="text" placeholder="Customer Name" className="border border-gray-300 rounded-md p-2" name="customer" value={form.customer} onChange={handleChange} />
            <input type="text" placeholder="Item" className="border border-gray-300 rounded-md p-2" name="item" value={form.item} onChange={handleChange} />
            <select className="border border-gray-300 rounded-md p-2" name="status" value={form.status} onChange={handleChange}>
              <option value="">Select Status</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Delivered">Delivered</option>
            </select>
            <button type="submit" className="bg-[#2adadd] text-white rounded-md p-2">{adding ? "Adding..." : "Add Order"}</button>
          </form>
        </div>
      </div>
    </div>
  );
};