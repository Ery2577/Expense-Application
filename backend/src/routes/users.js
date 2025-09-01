const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Assuming you have a User model
const Transaction = require('../models/Transaction'); // Assuming you have a Transaction model
const auth = require('../middleware/auth'); // Authentication middleware

const router = express.Router();

// Register a new user
router.post('/register', async(req, res) => {
    try {
        const { name, firstName, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const newUser = new User({
            name,
            firstName,
            email,
            password: hashedPassword,
            balance: 0,
            monthExpense: 0,
            monthlyRevenue: 0
        });

        await newUser.save();

        // Generate JWT token
        const token = jwt.sign({ userId: newUser._id },
            process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                firstName: newUser.firstName,
                email: newUser.email
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login user
router.post('/login', async(req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                firstName: user.firstName,
                email: user.email,
                balance: user.balance,
                monthExpense: user.monthExpense,
                monthlyRevenue: user.monthlyRevenue
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user profile
router.get('/profile', auth, async(req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Calculate current month's expenses and revenue
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const monthTransactions = await Transaction.find({
            userId: req.userId,
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const monthExpense = monthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const monthlyRevenue = monthTransactions
            .filter(t => t.type === 'revenue')
            .reduce((sum, t) => sum + t.amount, 0);

        // Update user with current month data
        user.monthExpense = monthExpense;
        user.monthlyRevenue = monthlyRevenue;
        await user.save();

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user profile
router.put('/profile', auth, async(req, res) => {
    try {
        const { name, firstName, email, password } = req.body;
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update fields
        if (name) user.name = name;
        if (firstName) user.firstName = firstName;
        if (email) user.email = email;

        if (password) {
            const saltRounds = 10;
            user.password = await bcrypt.hash(password, saltRounds);
        }

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                firstName: user.firstName,
                email: user.email
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add deposit/removal to balance
router.post('/balance', auth, async(req, res) => {
    try {
        const { amount, type } = req.body; // type: 'deposit' or 'removal'
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (type === 'deposit') {
            user.balance += amount;
        } else if (type === 'removal') {
            if (user.balance < amount) {
                return res.status(400).json({ message: 'Insufficient balance' });
            }
            user.balance -= amount;
        }

        await user.save();

        // Create transaction record
        const transaction = new Transaction({
            userId: req.userId,
            amount,
            type: type === 'deposit' ? 'revenue' : 'expense',
            category: type === 'deposit' ? 'Deposit' : 'Withdrawal',
            description: `Balance ${type}`,
            date: new Date()
        });

        await transaction.save();

        res.json({
            message: `${type} successful`,
            balance: user.balance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get dashboard data
router.get('/dashboard', auth, async(req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');

        // Get transactions for charts
        const transactions = await Transaction.find({ userId: req.userId });

        // Calculate category breakdown for pie chart
        const categoryData = {};
        transactions.forEach(t => {
            if (t.type === 'expense') {
                categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
            }
        });

        // Get monthly data for evolution chart
        const monthlyData = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const monthTransactions = transactions.filter(t =>
                t.date >= startOfMonth && t.date <= endOfMonth
            );

            const expenses = monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            const revenues = monthTransactions
                .filter(t => t.type === 'revenue')
                .reduce((sum, t) => sum + t.amount, 0);

            monthlyData.push({
                month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                expenses,
                revenues,
                balance: revenues - expenses
            });
        }

        res.json({
            user,
            categoryData,
            monthlyData
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;