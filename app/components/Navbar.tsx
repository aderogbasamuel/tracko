// import { Link } from "react-router-dom";
import Link from "next/link";
import { Icon } from "@iconify/react"; // Adjust path to your Auth hook
// import { useAuth } from "@/context/AuthContext";
// import { logoutUser } from "@/services/authService";
function Navbar({
  navbar,
  setNavbar,
}: {
  navbar: boolean;
  setNavbar: React.Dispatch<React.SetStateAction<boolean>>;
}) {
//   const { user} = useAuth(); // Get user and logout function
//   const navigate = useNavigate();

//   const handleLogout = async () => {
//     await logoutUser(); // Call the logout function from your auth service
//     setNavbar(false);
//     navigate("/login");
//   };

  const navLinks = [
    { path: "/home", title: "Home", icon: "solar:home-2-linear" },
    { path: "/orders", title: "Orders", icon: "solar:shop-linear" },
    // { path: "/checkout", title: "Checkout", icon: "solar:cart-check-linear" },
    // {path: "/order-tracking", title: "Orders", icon: "solar:receipt-linear" },
    { path: "/account", title: "Account", icon: "solar:user-circle-linear" },
    { path: "/settings", title: "Settings", icon: "solar:settings-linear" },
    { path: "/contact", title: "Contact", icon: "solar:phone-calling-linear" },
  ];

  return (
    <>
      {/* DESKTOP HORIZONTAL BAR */}
      <div className="hidden sm:flex gap-6 items-center border-b border-gray-50 bg-gray-50/30">
        {navLinks.map((link) => (
          <Link 
            key={link.path} 
            href={link.path} 
            className="font-bold text-gray-600 text-[12px] uppercase tracking-wider hover:text-[#2adadd] transition-colors"
          >
            {link.title}
          </Link>
        ))}
      </div>

      {/* MOBILE SIDEBAR */}
      <div className="relative">
        {/* Overlay */}
        {navbar && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setNavbar(false)}
          ></div>
        )}

        {/* Sidebar Panel */}
        <div
          className={`fixed transform transition-transform duration-300 ease-in-out z-50 w-[280px] bg-white flex flex-col top-0 left-0 h-full shadow-2xl ${
            navbar ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header Section (Login/User Info) */}
          <div className="bg-[#2adadd] p-6 px-4 pt-10 text-white relative">
            <button 
              className="absolute top-4 right-4 text-white/70 hover:text-white"
              onClick={() => setNavbar(false)}
            >
              <Icon icon="tabler:x" width="24" height="24" />
            </button>

            {/* {user ? (
              <div className="flex flex-col gap-1">
                <p className="text-white/70 text-xs uppercase tracking-widest font-bold">Welcome back,</p>
                <p className="text-xl font-bold truncate capitalize">{user.displayName || user.email?.split('@')[0]}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-lg font-bold">Your Account</p>
                <div className="flex gap-2 text-sm font-medium">
                  <Link to="/login" onClick={() => setNavbar(false)} className="underline decoration-white/30 underline-offset-4">Login</Link>
                  <span>or</span>
                  <Link to="/signup" onClick={() => setNavbar(false)} className="underline decoration-white/30 underline-offset-4">Join Us</Link>
                </div>
              </div>
            )} */}
            <div>
            <h3 className="text-xl font-bold">Tracko</h3>
            <p className="text-sm text-white/70">Track every sale. Grow every day.</p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex flex-col flex-1 overflow-y-auto py-4">
            <p className="px-5 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Menu</p>
            {navLinks.map((link) => (
              <Link
                href={link.path}
                key={link.title}
                onClick={() => setNavbar(false)}
                className="flex items-center gap-3 px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-blue-50 transition-colors border-l-4 border-transparent hover:border-[#2adadd]"
              >
                <Icon icon={link.icon} width="22" height="22" className="text-gray-400" />
                <span className="font-bold text-[14px] uppercase tracking-tight">{link.title}</span>
              </Link>
            ))}
          </div>

          {/* Footer (Logout) */}
          {/* {user && (
            <div className="p-6 border-t border-gray-100">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
              >
                <Icon icon="solar:logout-3-linear" width="20" height="20" />
                LOGOUT
              </button>
            </div>
          )} */}
        </div>
      </div>
    </>
  );
}

export default Navbar;