// backend/src/routes/transactions.js
const express = require('express');
const { body, param } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const {
    createTransaction,
    getTransactions,
    getTransactionStats,
    updateTransaction,
    deleteTransaction
} = require('../controllers/transactionController');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Validation rules
const transactionValidation = [
    body('type')
    .isIn(['expense', 'revenue'])
    .withMessage('Type must be either "expense" or "revenue"'),
    body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
    body('description')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Description is required'),
    body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO8601 date (YYYY-MM-DD)')
];

// Routes
router.post('/', transactionValidation, createTransaction); // Ajouter une transaction
router.get('/', getTransactions); // Lister toutes les transactions
router.get('/stats', getTransactionStats); // Obtenir des statistiques
router.put('/:id', [
        param('id').isInt().withMessage('Transaction ID must be an integer'),
        ...transactionValidation
    ],
    updateTransaction
); // Modifier une transaction
router.delete('/:id',
    param('id').isInt().withMessage('Transaction ID must be an integer'),
    deleteTransaction
); // Supprimer une transaction

module.exports = router;