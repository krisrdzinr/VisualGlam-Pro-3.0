import React from 'react';

export const Navbar: React.FC = () => (
  <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
          VisualGlam Pro 3.0
        </span>
      </div>
      <div className="hidden sm:flex gap-6 text-sm font-medium text-slate-400">
        <a href="#" className="hover:text-white transition-colors">Editor</a>
        <a href="#" className="hover:text-white transition-colors">Gallery</a>
      </div>
    </div>
  </nav>
);

export const Footer: React.FC = () => (
  <footer className="border-t border-slate-800 bg-slate-950 py-8">
    <div className="max-w-7xl mx-auto px-4 text-center">
      <p className="text-slate-500 text-sm">
        Powered by Gemini AI. Perspective transformation is AI-generative.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-slate-400 text-sm">
        <span>© 2024 VisualGlam Pro 3.0</span>
        <a href="#" className="hover:text-white">Privacy</a>
        <a href="#" className="hover:text-white">Terms</a>
      </div>
    </div>
  </footer>
);