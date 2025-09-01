import React, { useState } from 'react';
import { Search, Settings, User, PieChart, TrendingUp, Plus } from 'lucide-react';

const Dashboard = () => {
  const [userData] = useState({
    balance: 'MGA 00.000',
    monthExpense: 'MGA 00.000',
    monthlyRevenue: 'MGA 00.000'
  });

  const [expenseForm, setExpenseForm] = useState({
    category: '',
    amount: '',
    paymentMethod: '',
    description: '',
    date: ''
  });

  const handleExpenseChange = (e) => {
    setExpenseForm({
      ...expenseForm,
      [e.target.name]: e.target.value
    });
  };

  const handleAddExpense = () => {
    console.log('Adding expense:', expenseForm);
    // Reset form
    setExpenseForm({
      category: '',
      amount: '',
      paymentMethod: '',
      description: '',
      date: ''
    });
  };

  const handleDeposit = () => {
    console.log('Deposit clicked');
  };

  const handleRemoval = () => {
    console.log('Removal clicked');
  };

  return (
    <div className="min-h-screen bg-gray-200 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-300 p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-800">MoneyTrack</h1>
        </div>

        {/* User Profile */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-black rounded-full mb-4"></div>
          <p className="text-sm text-gray-600">Hello, User</p>
          <p className="text-xs text-gray-500">Develop.adr</p>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          <div className="flex items-center space-x-3 p-2 bg-green-300 rounded text-gray-800">
            <div className="w-4 h-4 bg-gray-600 rounded"></div>
            <span>Dashboard</span>
          </div>
          <div className="flex items-center space-x-3 p-2 text-gray-600">
            <div className="w-4 h-4 bg-gray-600 rounded"></div>
            <span>My Wallet</span>
          </div>
          <div className="flex items-center space-x-3 p-2 text-gray-600">
            <div className="w-4 h-4 bg-gray-600 rounded"></div>
            <span>Transaction</span>
          </div>
        </nav>

        <div className="mt-auto pt-8">
          <p className="text-xs text-gray-500">Setting</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-green-200">
        {/* Header */}
        <div className="flex justify-between items-center p-6 bg-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 bg-gray-400 rounded-lg text-gray-700 placeholder-gray-600 outline-none"
            />
          </div>
          <div className="flex space-x-4">
            <Settings className="w-6 h-6 text-gray-600 cursor-pointer" />
            <User className="w-6 h-6 text-gray-600 cursor-pointer" />
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-2