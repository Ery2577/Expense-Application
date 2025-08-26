// backend/src/controllers/authController.js
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { database } = require('../database/db');
const { generateToken } = require('../middleware/auth');

const register = async(req, res) => {
    try {
        // Vérification des erreurs de validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: 'Validation errors',
                errors: errors.array()
            });
        }

        const { name, firstname, email, password } = req.body;

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await database.get(
            'SELECT id FROM users WHERE email = ?', [email]
        );

        if (existingUser) {
            return res.status(400).json({
                message: 'User already exists with this email'
            });
        }

        // Hasher le mot de passe
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Créer l'utilisateur
        const result = await database.run(
            `INSERT INTO users (name, firstname, email, password) 
       VALUES (?, ?, ?, ?)`, [name, firstname, email, hashedPassword]
        );

        // Générer le token JWT
        const token = generateToken({
            id: result.id,
            email: email,
            name: name,
            firstname: firstname
        });

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: result.id,
                name,
                firstname,
                email
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            message: 'Server error during registration',
            error: error.message
        });
    }
};

const login = async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: 'Validation errors',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Trouver l'utilisateur
        const user = await database.get(
            'SELECT * FROM users WHERE email = ?', [email]
        );

        if (!user) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        // Vérifier le mot de passe
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        // Générer le token JWT
        const token = generateToken({
            id: user.id,
            email: user.email,
            name: user.name,
            firstname: user.firstname
        });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                firstname: user.firstname,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            message: 'Server error during login',
            error: error.message
        });
    }
};

const getProfile = async(req, res) => {
    try {
        const user = await database.get(
            'SELECT id, name, firstname, email, created_at FROM users WHERE id = ?', [req.user.id]
        );

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        res.json({
            user
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            message: 'Server error getting profile',
            error: error.message
        });
    }
};

module.exports = {
    register,
    login,
    getProfile
};