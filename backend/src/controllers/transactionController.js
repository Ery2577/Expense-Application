// backend/src/controllers/transactionController.js
const { validationResult } = require('express-validator');
const { database } = require('../database/db');

const createTransaction = async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: 'Validation errors',
                errors: errors.array()
            });
        }

        const { type, amount, description, category, payment_method, date } = req.body;
        const userId = req.user.id;

        const result = await database.run(
            `INSERT INTO transactions (user_id, type, amount, description, category, payment_method, date) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [userId, type, amount, description, category, payment_method, date]
        );

        res.status(201).json({
            message: 'Transaction created successfully',
            transaction: {
                id: result.id,
                type,
                amount,
                description,
                category,
                payment_method,
                date
            }
        });

    } catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({
            message: 'Server error creating transaction',
            error: error.message
        });
    }
};

const getTransactions = async(req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10, type, category, startDate, endDate } = req.query;

        let query = 'SELECT * FROM transactions WHERE user_id = ?';
        let params = [userId];

        // Filtres optionnels
        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        if (startDate) {
            query += ' AND date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND date <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY date DESC, created_at DESC';

        // Pagination
        const offset = (page - 1) * limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const transactions = await database.all(query, params);

        // Compter le total pour la pagination
        let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?';
        let countParams = [userId];

        if (type) {
            countQuery += ' AND type = ?';
            countParams.push(type);
        }
        if (category) {
            countQuery += ' AND category = ?';
            countParams.push(category);
        }
        if (startDate) {
            countQuery += ' AND date >= ?';
            countParams.push(startDate);
        }
        if (endDate) {
            countQuery += ' AND date <= ?';
            countParams.push(endDate);
        }

        const totalResult = await database.get(countQuery, countParams);
        const total = totalResult.total;

        res.json({
            transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            message: 'Server error getting transactions',
            error: error.message
        });
    }
};

const getTransactionStats = async(req, res) => {
    try {
        const userId = req.user.id;
        const { period = 'month' } = req.query; // month, week, year

        let dateFilter = '';
        switch (period) {
            case 'week':
                dateFilter = "date >= date('now', '-7 days')";
                break;
            case 'month':
                dateFilter = "date >= date('now', '-30 days')";
                break;
            case 'year':
                dateFilter = "date >= date('now', '-365 days')";
                break;
            default:
                dateFilter = "date >= date('now', '-30 days')";
        }

        // Statistiques générales
        const stats = await database.get(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
        COUNT(CASE WHEN type = 'revenue' THEN 1 END) as revenue_count,
        COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
      FROM transactions 
      WHERE user_id = ? AND ${dateFilter}
    `, [userId]);

        // Répartition par catégorie
        const categoryStats = await database.all(`
      SELECT 
        category,
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions 
      WHERE user_id = ? AND ${dateFilter}
      GROUP BY category, type
      ORDER BY total DESC
    `, [userId]);

        // Balance actuelle
        const balance = await database.get(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'revenue' THEN amount ELSE -amount END), 0) as current_balance
      FROM transactions 
      WHERE user_id = ?
    `, [userId]);

        res.json({
            period,
            stats: {
                ...stats,
                balance: balance.current_balance,
                net_income: stats.total_revenue - stats.total_expense
            },
            categoryBreakdown: categoryStats
        });

    } catch (error) {
        console.error('Get transaction stats error:', error);
        res.status(500).json({
            message: 'Server error getting transaction stats',
            error: error.message
        });
    }
};

const updateTransaction = async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: 'Validation errors',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { type, amount, description, category, payment_method, date } = req.body;
        const userId = req.user.id;

        const result = await database.run(
            `UPDATE transactions 
       SET type = ?, amount = ?, description = ?, category = ?, payment_method = ?, date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`, [type, amount, description, category, payment_method, date, id, userId]
        );

        if (result.changes === 0) {
            return res.status(404).json({
                message: 'Transaction not found or you do not have permission to update it'
            });
        }

        res.json({
            message: 'Transaction updated successfully'
        });

    } catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({
            message: 'Server error updating transaction',
            error: error.message
        });
    }
};

const deleteTransaction = async(req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await database.run(
            'DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId]
        );

        if (result.changes === 0) {
            return res.status(404).json({
                message: 'Transaction not found or you do not have permission to delete it'
            });
        }

        res.json({
            message: 'Transaction deleted successfully'
        });

    } catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({
            message: 'Server error deleting transaction',
            error: error.message
        });
    }
};

module.exports = {
    createTransaction,
    getTransactions,
    getTransactionStats,
    updateTransaction,
    deleteTransaction
};