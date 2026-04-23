import React from "react";
import { Link } from "react-router-dom";
import { SidebarHeader as UiSidebarHeader } from "@/components/ui/sidebar";

export function SidebarHeader() {
  return (
    <UiSidebarHeader className="p-4 border-b border-brand-blue/10 bg-gradient-to-r from-brand-blue/5 to-brand-yellow/5">
      <Link to="/" className="flex items-center space-x-3 group">
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
            <span className="text-white font-bold text-lg">P</span>
            {/* Effet de brillance */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          {/* Indicator IA Active */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
        </div>

        <div className="hidden md:block">
          <h1 className="font-bold text-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-clip-text text-transparent">
            Pixel<span className="text-blue-600">Rise</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium tracking-wide">IA MARKETING AUTOMATION</p>
        </div>
      </Link>
    </UiSidebarHeader>
  );
}