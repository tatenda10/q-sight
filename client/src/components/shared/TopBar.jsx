import React from 'react';
import capesso from '../../assets/capesso-logo.png'
const TopBar = () => {
  return (
    <header className="w-full h-14 flex items-center px-6 bg-white shadow-md z-30 fixed left-0 top-0 right-0">
      <div className="flex-1 flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          {/* Avatar with the letter T */}
         
<img src={capesso} alt="Logo" className=" h-8" />
        </div>

        {/* Actions - User Menu, Notifications, Sign Out */}
        <div className="flex items-center space-x-4">
        <div className="w-8 h-8 rounded-full bg-[#E95900] flex items-center justify-center text-white font-semibold text-lg">
            T
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
